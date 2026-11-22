import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { Database } from "../database/database";
import { draftWorkEntries, overlapsDraftWork, overlapsPrivateDraft, ownsPrivateDraft, redeemedDraftInvite, overlapStart, overlapEnd } from "./eligibility";
import { cleanCompany } from "./companies";
import { linkedInSourceInput, ratingInput, workImportInput, workInput } from "./inputs";

export const workQuery = `SELECT w.id, c.name AS company, w.title, w.start_date::text AS start, w.end_date::text AS end,
    w.linkedin_source AS "linkedinSource"
  FROM work_history w JOIN companies c ON c.id = w.company_id WHERE w.user_id = $1 ORDER BY w.start_date DESC, w.id`;
const workTitleKey = (title: string) => cleanCompany(title).toLowerCase().replace(/^1с(?=$|[\s:/()-])/u, "1c");
function compareCompanies(first: string, second: string) {
  const a = first.toLowerCase();
  const b = second.toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
}
const ratingFields = `r.id, r.overall, r.categories, r.feedback, r.anonymous, r.hidden, r.updated_at AS "updatedAt"`;
export const sharedWork = (author: string, colleague: string) => `EXISTS (
  SELECT 1 FROM work_history a JOIN work_history r ON a.company_id = r.company_id
  WHERE a.user_id = ${author} AND r.user_id = ${colleague} AND ${overlapStart} <= ${overlapEnd}
)`;

@Injectable()
export class PilotService {
  constructor(private readonly db: Database) {}

  async dashboard(userId: string) {
    const { rows: [summary] } = await this.db.pool.query<{
      workHistoryCount: number;
      eligibleColleagueCount: number;
      unopenedRatingCount: number;
    }>(
      `SELECT (SELECT count(*)::integer FROM work_history WHERE user_id = u.id) AS "workHistoryCount",
         (SELECT count(DISTINCT r.user_id)::integer
          FROM work_history a JOIN work_history r ON a.company_id = r.company_id
          JOIN users colleague ON colleague.id = r.user_id
          WHERE a.user_id = u.id AND r.user_id <> u.id
            AND colleague.suspended_at IS NULL
            AND ${overlapStart} <= ${overlapEnd}) AS "eligibleColleagueCount",
         (SELECT count(*)::integer FROM ratings
          WHERE recipient_id = u.id AND NOT hidden AND first_opened_at IS NULL) AS "unopenedRatingCount"
       FROM users u WHERE u.id = $1 AND u.suspended_at IS NULL`,
      [userId],
    );
    if (!summary) throw new UnauthorizedException("Sign in to continue.");
    return summary;
  }

  async work(userId: string) {
    const { rows } = await this.db.pool.query(workQuery, [userId]);
    const result = await this.db.pool.query<{ linkedinProfileUrl: string | null }>(
      `SELECT linkedin_profile_url AS "linkedinProfileUrl"
       FROM users WHERE id = $1 AND suspended_at IS NULL`, [userId],
    );
    if (!result.rowCount) throw new UnauthorizedException("Sign in to continue.");
    return { history: rows, ...result.rows[0] };
  }

  private async lockActiveAccount(client: PoolClient, userId: string) {
    const result = await client.query(
      "SELECT id FROM users WHERE id = $1 AND suspended_at IS NULL FOR NO KEY UPDATE", [userId],
    );
    if (!result.rowCount) throw new UnauthorizedException("Sign in to continue.");
  }

  private async workCompany(client: PoolClient, name: string) {
    const { rows: [company] } = await client.query<{ id: string }>(
      `WITH known AS (SELECT company_id AS id FROM company_aliases WHERE name_key = $2),
       registered AS (
         INSERT INTO companies (name, name_key) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM known)
         ON CONFLICT (name_key) DO UPDATE SET name_key = EXCLUDED.name_key RETURNING id
       )
       SELECT id FROM known UNION ALL SELECT id FROM registered`, [name, name.toLowerCase()],
    );
    return company.id;
  }

  private async insertWork(client: PoolClient, userId: string, entry: ReturnType<typeof workInput>,
    source: ReturnType<typeof linkedInSourceInput>, checkDuplicate: boolean) {
    const sourceKey = source?.company && source.title && source.start && source.end !== "" ? JSON.stringify(source) : null;
    if (sourceKey) {
      const existingSource = await client.query("SELECT 1 FROM work_history WHERE user_id=$1 AND linkedin_source=$2::jsonb", [userId, sourceKey]);
      if (existingSource.rowCount) return false;
    }
    const companyId = await this.workCompany(client, entry.company);
    if (checkDuplicate) {
      const { rows } = await client.query<{ title: string; start: string; end: string | null }>(
        `SELECT title, start_date::text AS start, end_date::text AS end
         FROM work_history WHERE user_id = $1 AND company_id = $2`, [userId, companyId],
      );
      const title = workTitleKey(entry.title);
      const sourceTitle = source ? workTitleKey(source.title) : "";
      const duplicate = rows.some(row => {
        const savedTitle = workTitleKey(row.title);
        if (savedTitle === title && row.start === entry.start && row.end === entry.end) return true;
        return source && savedTitle === sourceTitle && !!source.start && row.start.startsWith(source.start) &&
          (source.end === null ? row.end === null : !!source.end && row.end?.startsWith(source.end));
      });
      if (duplicate) return false;
    }
    await client.query(
      "INSERT INTO work_history (user_id, company_id, title, start_date, end_date, linkedin_source) VALUES ($1, $2, $3, $4, $5, $6)",
      [userId, companyId, entry.title, entry.start, entry.end, sourceKey],
    );
    return true;
  }

  async saveWork(userId: string, entryId: string | null, entry: ReturnType<typeof workInput>, source?: ReturnType<typeof linkedInSourceInput>) {
    await this.db.limit("work:" + userId, 60);
    await this.db.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      await this.lockActiveAccount(client, userId);
      if (!entryId) {
        if (!await this.insertWork(client, userId, entry, source, Boolean(source))) {
          throw new ConflictException("This LinkedIn position is already in your work history.");
        }
        return;
      }
      const companyId = await this.workCompany(client, entry.company);
      const updated = await client.query(
        `UPDATE work_history SET company_id = $2, title = $3, start_date = $4, end_date = $5
         WHERE user_id = $1 AND id = $6`, [userId, companyId, entry.title, entry.start, entry.end, entryId],
      );
      if (!updated.rowCount) throw new NotFoundException("Work history entry not found.");
    });
  }

  async importWork(userId: string, entries: ReturnType<typeof workImportInput>) {
    await this.db.limit("work-import:" + userId, 12);
    // Acquire company write locks in a consistent order across concurrent imports.
    const ordered = [...entries].sort((a, b) => compareCompanies(a.entry.company, b.entry.company));
    return this.db.transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      await this.lockActiveAccount(client, userId);
      let saved = 0;
      for (const { entry, source } of ordered) {
        if (await this.insertWork(client, userId, entry, source, true)) saved += 1;
      }
      return { saved, skipped: entries.length - saved };
    });
  }

  async replaceDraftWork(client: PoolClient, draftId: string, history: Array<ReturnType<typeof workInput>>) {
    await client.query("DELETE FROM work_history WHERE user_id=$1", [draftId]);
    // Use the same company lock order as the bulk work-history importer.
    const ordered = [...history].sort((a, b) => compareCompanies(a.company, b.company));
    for (const entry of ordered) await this.insertWork(client, draftId, entry, undefined, true);
  }

  async deleteWork(userId: string, entryId: string) {
    await this.db.limit("work:" + userId, 60);
    await this.db.transaction(async (client) => {
      await this.lockActiveAccount(client, userId);
      const removed = await client.query("DELETE FROM work_history WHERE user_id = $1 AND id = $2", [userId, entryId]);
      if (!removed.rowCount) throw new NotFoundException("Work history entry not found.");
    });
  }

  async setLinkedInProfile(userId: string, url: string | null) {
    await this.db.limit("profile-link:" + userId, 30);
    await this.db.transaction(async client => {
      if (url) {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [url]);
        const protectedLink = await client.query(
          `SELECT 1 FROM colleague_profiles WHERE linkedin_profile_url=$1
           AND (shared OR claimed_at IS NOT NULL) AND claimed_by IS DISTINCT FROM $2`, [url, userId],
        );
        if (protectedLink.rowCount) throw new ConflictException("This profile has a shared draft or belongs to another member. Open it from Find colleagues.");
      }
      await this.lockActiveAccount(client, userId);
      await client.query("UPDATE users SET linkedin_profile_url=$2 WHERE id=$1", [userId, url]);
    });
  }

  async search(userId: string, term: string, page: number, profileUrl: string | null = null) {
    const pageSize = 50;
    const { rows } = await this.db.pool.query<{
      professionals: Array<{ id: string; name: string; eligible: boolean; draft?: true; privateDraft?: true }>;
      hasWorkHistory: boolean;
    }>(
      `WITH work_matches AS (
         SELECT DISTINCT u.id
         FROM work_history a JOIN work_history r ON a.company_id = r.company_id
         JOIN users u ON u.id = r.user_id
         WHERE a.user_id = $1 AND u.id <> $1 AND u.suspended_at IS NULL
           AND ${overlapStart} <= ${overlapEnd}
       ), matched_people AS (
         SELECT u.id, u.name, true AS eligible, CASE WHEN d.id IS NOT NULL THEN true END AS draft,
           coalesce($5::text,d.linkedin_profile_url,u.linkedin_profile_url) AS url
         FROM work_matches w JOIN users u ON u.id=w.id
         LEFT JOIN colleague_profiles d ON d.id=u.id
         WHERE d.claimed_at IS NULL AND (d.id IS NULL OR d.shared)
           AND CASE WHEN $5::text IS NOT NULL THEN
             coalesce(d.linkedin_profile_url, u.linkedin_profile_url) = $5
             OR EXISTS (SELECT 1 FROM colleague_profiles p WHERE p.claimed_by=u.id AND p.linkedin_profile_url=$5)
           ELSE strpos(lower(u.name), lower($2)) > 0 END
         UNION ALL
         SELECT u.id, u.name, ${overlapsPrivateDraft("$1", "u.id")} AS eligible, true AS draft, p.linkedin_profile_url AS url
         FROM colleague_profiles p JOIN users u ON u.id=p.id
         WHERE p.claimed_at IS NULL AND u.suspended_at IS NULL AND p.shared
           AND NOT EXISTS (SELECT 1 FROM work_matches w WHERE w.id=p.id)
           AND CASE WHEN $5::text IS NOT NULL THEN p.linkedin_profile_url=$5
                    ELSE $2 <> '' AND strpos(lower(u.name), lower($2)) > 0 END
       ), matches AS (
         SELECT id, name, eligible, draft, NULL::boolean AS "privateDraft" FROM matched_people
         UNION ALL
         SELECT d.id, d.name, matched.eligible, NULL::boolean AS draft, true AS "privateDraft"
         FROM colleague_drafts d
         CROSS JOIN LATERAL (SELECT ${overlapsDraftWork("$1", "d.history")} AS eligible) matched
         WHERE d.owner_id=$1
           AND NOT EXISTS (
             SELECT 1 FROM matched_people m
             WHERE m.url=d.linkedin_profile_url OR EXISTS (
               SELECT 1 FROM colleague_profiles p WHERE p.claimed_by=m.id AND p.linkedin_profile_url=d.linkedin_profile_url
             )
           )
           AND CASE WHEN $5::text IS NOT NULL THEN d.linkedin_profile_url=$5
             WHEN $2='' THEN matched.eligible ELSE strpos(lower(d.name), lower($2))>0 END
         ORDER BY name, id LIMIT $3 OFFSET $4
       )
       SELECT coalesce((SELECT jsonb_agg(jsonb_strip_nulls(to_jsonb(p)) ORDER BY p.name, p.id) FROM matches p), '[]'::jsonb) AS professionals,
         EXISTS (SELECT 1 FROM work_history WHERE user_id = $1) AS "hasWorkHistory"`,
      [userId, term, pageSize + 1, (page - 1) * pageSize, profileUrl],
    );
    const { professionals, hasWorkHistory } = rows[0];
    return { professionals: professionals.slice(0, pageSize), hasMore: professionals.length > pageSize, hasWorkHistory };
  }

  async profile(userId: string, recipientId: string) {
    const result = await this.db.pool.query(
      `WITH target AS (
         SELECT u.id, coalesce(own.name,u.name) AS name,
           p.claimed_at IS NULL AND (p.shared OR own.id IS NOT NULL OR ${redeemedDraftInvite("$2")}) AS draft,
           p.shared=false AS privateDraft,
           coalesce(p.claimed_by=$2,false) AS claimedByViewer,
           u.id <> $2 AND (${sharedWork("$2", "u.id")} OR ${overlapsPrivateDraft("$2", "u.id")}) AS eligible
         FROM users u LEFT JOIN colleague_profiles p ON p.id=$1
         LEFT JOIN colleague_drafts own ON own.owner_id=$2 AND own.linkedin_profile_url=p.linkedin_profile_url
           AND p.claimed_at IS NULL AND p.shared=false
         WHERE u.id=coalesce(p.claimed_by, $1) AND u.suspended_at IS NULL
       )
       SELECT id, name, eligible, draft, privateDraft AS "privateDraft", claimedByViewer AS "claimedByViewer"
       FROM target WHERE draft OR eligible OR claimedByViewer`,
      [recipientId, userId],
    );
    const recipient = result.rows[0];
    if (!recipient) throw new NotFoundException("Colleague not found.");
    const { draft, privateDraft, claimedByViewer, ...person } = recipient;
    return { ...person, ...(draft ? { draft } : {}), ...(privateDraft ? { privateDraft } : {}), ...(claimedByViewer ? { claimedByViewer } : {}) };
  }

  private async overlap(client: Pool | PoolClient, author: string, recipient: string) {
    const { rows } = await client.query(
      `SELECT a.company_id AS "companyId", c.name AS "company",
         (${overlapStart})::text AS start,
         (${overlapEnd})::text AS end
       FROM work_history a JOIN work_history r ON r.company_id = a.company_id
       JOIN companies c ON c.id = a.company_id
       WHERE a.user_id = $1 AND r.user_id = $2
         AND ${overlapStart} <= ${overlapEnd}
       ORDER BY ${overlapStart}, a.id, r.id LIMIT 1`, [author, recipient],
    );
    return rows[0];
  }

  private async privateDraftOverlap(client: PoolClient, author: string, recipient: string) {
    const { rows: [match] } = await client.query(
      `SELECT c.id AS "companyId", c.name AS company, (${overlapStart})::text AS start, (${overlapEnd})::text AS end
       FROM colleague_profiles p JOIN colleague_drafts d ON d.linkedin_profile_url=p.linkedin_profile_url
       CROSS JOIN LATERAL (${draftWorkEntries("d.history")}) r
       JOIN work_history a ON a.user_id=d.owner_id AND a.company_id=r.company_id
       JOIN companies c ON c.id=r.company_id
       WHERE p.id=$2 AND p.claimed_at IS NULL AND d.owner_id=$1 AND ${overlapStart} <= ${overlapEnd}
       ORDER BY ${overlapStart}, a.id, r.position LIMIT 1`, [author, recipient],
    );
    return match;
  }

  async given(userId: string, recipientId: string) {
    const { rows } = await this.db.pool.query(
      `SELECT ${ratingFields}, u.name AS name, u.id AS "personId"
       FROM ratings r JOIN users u ON u.id = r.recipient_id WHERE r.author_id = $1 AND r.recipient_id = $2`,
      [userId, recipientId],
    );
    return rows[0] || null;
  }

  async saveRating(author: string, recipient: string, rating: ReturnType<typeof ratingInput>) {
    if (author === recipient) throw new ForbiddenException("You can only rate another member.");
    await this.db.limit("rating:" + author, 30);

    return this.db.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      const { rows } = await client.query<{ id: string; draft: boolean }>(
        `SELECT id, issuer='eprorate:colleague-draft' AS draft FROM users WHERE id IN ($1, $2) AND suspended_at IS NULL
         ORDER BY id FOR NO KEY UPDATE`, [author, recipient],
      );
      if (!rows.some((row) => row.id === author && !row.draft)) throw new UnauthorizedException("Sign in to continue.");
      const target = rows.find(row => row.id === recipient);
      if (!target) {
        throw new NotFoundException("Colleague not found.");
      }
      if (target.draft) {
        const access = await client.query(
          `SELECT 1 FROM colleague_profiles p WHERE p.id=$2 AND (p.shared OR ${ownsPrivateDraft("$1")})`,
          [author, recipient],
        );
        if (!access.rowCount) throw new NotFoundException("Colleague not found.");
      }
      const settings = await client.query<{ submissions_paused: boolean }>(
        "SELECT submissions_paused FROM pilot_settings WHERE id FOR SHARE",
      );
      if (settings.rows[0].submissions_paused) throw new ConflictException("Rating submissions are paused.");
      const officialOverlap = await this.overlap(client, author, recipient);
      const evidence = officialOverlap ?? (target.draft ? await this.privateDraftOverlap(client, author, recipient) : null);
      if (!evidence) throw new ForbiddenException("Your work dates must overlap at the same company.");

      const before = await client.query<{ id: string; hidden: boolean }>(
        "SELECT id, hidden FROM ratings WHERE author_id = $1 AND recipient_id = $2 FOR UPDATE",
        [author, recipient],
      );
      if (before.rows[0]) {
        const review = await client.query("SELECT 1 FROM reports WHERE rating_id = $1 AND status = 'open'", [before.rows[0].id]);
        if (before.rows[0].hidden || review.rowCount) throw new ConflictException("This rating is being moderated.");
      }
      const result = await client.query<{ id: string }>(
        `INSERT INTO ratings (author_id, recipient_id, overall, categories, feedback, anonymous, eligibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (author_id, recipient_id) DO UPDATE
         SET overall = EXCLUDED.overall, categories = EXCLUDED.categories, feedback = EXCLUDED.feedback,
             anonymous = EXCLUDED.anonymous, eligibility = EXCLUDED.eligibility, updated_at = now()
         RETURNING id`,
        [author, recipient, rating.overall, rating.categories, rating.feedback, rating.anonymous,
          { ...evidence, version: 1, ...(target.draft ? officialOverlap ? { fromSharedDraft: true } : { fromPrivateDraft: true } : {}) }],
      );
      return result.rows[0];
    });
  }

  async ratings(userId: string) {
    const [given, received] = await Promise.all([
      this.db.pool.query(
        `SELECT ${ratingFields}, coalesce(d.name,u.name) AS name, u.id AS "personId",
           (u.suspended_at IS NULL AND (${sharedWork("$1", "u.id")} OR ${overlapsPrivateDraft("$1", "u.id")})) AS "canOpenProfile"
         FROM ratings r JOIN users u ON u.id=r.recipient_id
         LEFT JOIN colleague_profiles p ON p.id=u.id AND p.shared=false
         LEFT JOIN colleague_drafts d ON d.owner_id=$1 AND d.linkedin_profile_url=p.linkedin_profile_url
         WHERE r.author_id = $1
         ORDER BY r.updated_at DESC`, [userId],
      ),
      this.db.pool.query(
        `SELECT ${ratingFields}, CASE WHEN r.anonymous THEN 'Anonymous colleague' ELSE u.name END AS name,
            (SELECT p.status FROM reports p WHERE p.rating_id = r.id
             ORDER BY p.created_at DESC, p.id DESC LIMIT 1) AS "reportStatus",
            (r.first_opened_at IS NOT NULL) AS opened
         FROM ratings r JOIN users u ON u.id = r.author_id
         WHERE r.recipient_id = $1 AND NOT r.hidden ORDER BY r.updated_at DESC`, [userId],
      ),
    ]);
    return { given: given.rows, received: received.rows };
  }

  async openRatings(userId: string, ids: string[]) {
    await this.db.transaction(async (client) => {
      await this.lockActiveAccount(client, userId);
      await client.query(
        `UPDATE ratings SET first_opened_at = now() WHERE recipient_id = $1
         AND id = ANY($2::uuid[]) AND NOT hidden AND first_opened_at IS NULL`, [userId, ids],
      );
    });
  }

  async report(userId: string, ratingId: string, reason: string) {
    await this.db.limit("report:" + userId, 15);
    await this.db.transaction(async (client) => {
      await this.lockActiveAccount(client, userId);
      const rating = await client.query(
        "SELECT overall, feedback, eligibility FROM ratings WHERE id = $1 AND recipient_id = $2 AND NOT hidden FOR UPDATE",
        [ratingId, userId],
      );
      if (!rating.rowCount) throw new NotFoundException("Rating not found.");
      const report = await client.query(
        `INSERT INTO reports (rating_id, reason, rating_snapshot, created_at) VALUES ($1, $2, $3, clock_timestamp())
         ON CONFLICT (rating_id) WHERE status = 'open' DO NOTHING RETURNING id`,
        [ratingId, reason, rating.rows[0]],
      );
      if (!report.rowCount) throw new ConflictException("This rating has already been reported.");
    });
  }

  async reportsFiledBy(userId: string) {
    const { rows } = await this.db.pool.query(
      `SELECT p.id, p.reason, p.created_at AS "createdAt", latest.created_at AS "decidedAt",
         CASE WHEN p.status = 'open' THEN 'open'
              WHEN p.status = 'hidden' THEN 'hidden'
              WHEN latest.action = 'reinstate' THEN 'restored'
              ELSE 'kept' END AS outcome
       FROM reports p JOIN ratings r ON r.id = p.rating_id
       LEFT JOIN LATERAL (
         SELECT action, created_at FROM moderation_actions WHERE report_id = p.id ORDER BY id DESC LIMIT 1
       ) latest ON p.status <> 'open'
       WHERE r.recipient_id = $1 ORDER BY p.created_at DESC, p.id DESC`, [userId],
    );
    return rows;
  }

  async moderation(status: "all" | "open" | "resolved", page: number) {
    const pageSize = 50;
    const [reports, settings] = await Promise.all([
      this.db.pool.query(
        `SELECT p.id, p.reason, p.status, p.created_at AS "createdAt", p.responded_at AS "respondedAt",
           (p.rating_snapshot->>'overall')::smallint AS overall, p.rating_snapshot->>'feedback' AS feedback,
           p.rating_snapshot->'eligibility' AS eligibility, a.name AS author, b.name AS recipient
         FROM reports p JOIN ratings r ON r.id = p.rating_id
         JOIN users a ON a.id = r.author_id JOIN users b ON b.id = r.recipient_id
         WHERE $1 = 'all' OR ($1 = 'open' AND p.status = 'open') OR ($1 = 'resolved' AND p.status <> 'open')
         ORDER BY (p.status = 'open') DESC, p.created_at DESC, p.id DESC LIMIT $2 OFFSET $3`,
        [status, pageSize + 1, (page - 1) * pageSize],
      ),
      this.db.pool.query<{ submissions_paused: boolean }>("SELECT submissions_paused FROM pilot_settings WHERE id"),
    ]);
    return {
      reports: reports.rows.slice(0, pageSize), hasMore: reports.rows.length > pageSize,
      paused: settings.rows[0].submissions_paused,
    };
  }

  async moderationHistory(reportId: string) {
    const report = await this.db.pool.query("SELECT 1 FROM reports WHERE id = $1", [reportId]);
    if (!report.rowCount) throw new NotFoundException("Report not found.");

    const { rows } = await this.db.pool.query(
      `SELECT m.id::text, m.action, m.note, m.created_at AS "createdAt", u.name AS operator
       FROM moderation_actions m LEFT JOIN users u ON u.id = m.operator_id
       WHERE m.report_id = $1 ORDER BY m.id DESC`, [reportId],
    );
    return rows;
  }

  async moderate(operator: string, reportId: string, action: "hide" | "reinstate" | "dismiss", note: string) {
    await this.db.transaction(async (client) => {
      const { rows } = await client.query<{ id: string; hidden: boolean }>(
        `SELECT r.id, r.hidden FROM ratings r JOIN reports p ON p.rating_id = r.id
         WHERE p.id = $1 FOR UPDATE OF r`, [reportId],
      );
      const rating = rows[0];
      if (!rating) throw new NotFoundException("Report not found.");
      const report = await client.query<{ status: string }>("SELECT status FROM reports WHERE id = $1", [reportId]);
      const currentStatus = report.rows[0].status;
      if (action === "reinstate" ? currentStatus !== "hidden" || !rating.hidden : currentStatus !== "open") {
        throw new ConflictException("This report already has a decision.");
      }
      await client.query("UPDATE ratings SET hidden = $2 WHERE id = $1", [rating.id, action === "hide"]);
      await client.query(
        "UPDATE reports SET status = $2, responded_at = coalesce(responded_at, clock_timestamp()) WHERE id = $1",
        [reportId, action === "hide" ? "hidden" : "dismissed"],
      );
      await client.query(
        "INSERT INTO moderation_actions (report_id, operator_id, action, note, created_at) VALUES ($1, $2, $3, $4, clock_timestamp())",
        [reportId, operator, action, note]);
    });
  }

  async pause(paused: boolean) {
    await this.db.pool.query("UPDATE pilot_settings SET submissions_paused = $1 WHERE id", [paused]);
  }
}
