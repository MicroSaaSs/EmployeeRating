import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { Database } from "../database/database";
import { overlapStart, overlapEnd } from "./eligibility";
import { cleanCompany } from "./companies";
import { linkedInSourceInput, ratingInput, workInput } from "./inputs";

const workQuery = `SELECT w.id, c.name AS company, w.title, w.start_date::text AS start, w.end_date::text AS end,
    w.linkedin_source AS "linkedinSource"
  FROM work_history w JOIN companies c ON c.id = w.company_id WHERE w.user_id = $1 ORDER BY w.start_date DESC, w.id`;
const ratingFields = `r.id, r.overall, r.categories, r.feedback, r.anonymous, r.hidden, r.updated_at AS "updatedAt"`;

@Injectable()
export class PilotService {
  constructor(private readonly db: Database) {}

  async work(userId: string) {
    const { rows } = await this.db.pool.query(workQuery, [userId]);
    const result = await this.db.pool.query<{ visible: boolean }>(
      "SELECT directory_visible AS visible FROM users WHERE id = $1 AND suspended_at IS NULL", [userId],
    );
    if (!result.rowCount) throw new UnauthorizedException("Sign in to continue.");
    return { history: rows, visible: result.rows[0].visible };
  }

  private async lockActiveAccount(client: PoolClient, userId: string) {
    const result = await client.query(
      "SELECT id FROM users WHERE id = $1 AND suspended_at IS NULL FOR NO KEY UPDATE", [userId],
    );
    if (!result.rowCount) throw new UnauthorizedException("Sign in to continue.");
  }

  async saveWork(userId: string, entryId: string | null, entry: ReturnType<typeof workInput>, source?: ReturnType<typeof linkedInSourceInput>) {
    await this.db.limit("work:" + userId, 60);
    await this.db.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      await this.lockActiveAccount(client, userId);
      const company = await client.query<{ id: string }>(
        `WITH known AS (SELECT company_id AS id FROM company_aliases WHERE name_key = $2),
         registered AS (
           INSERT INTO companies (name, name_key) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM known)
           ON CONFLICT (name_key) DO UPDATE SET name_key = EXCLUDED.name_key RETURNING id
         )
         SELECT id FROM known UNION ALL SELECT id FROM registered`,
        [entry.company, entry.company.toLowerCase()],
      );
      const data = [userId, company.rows[0].id, entry.title, entry.start, entry.end];
      if (entryId) {
        const updated = await client.query(
          `UPDATE work_history SET company_id = $2, title = $3, start_date = $4, end_date = $5
           WHERE user_id = $1 AND id = $6`, [...data, entryId],
        );
        if (!updated.rowCount) throw new NotFoundException("Work history entry not found.");
      } else {
        const sourceKey = source?.company && source.title && source.start && source.end !== "" ? JSON.stringify(source) : null;
        if (source) {
          const existing = await client.query<{ same_source: boolean; title: string; start: string; end: string | null }>(
            `SELECT coalesce(linkedin_source = $3::jsonb, false) AS same_source, title, start_date::text AS start, end_date::text AS end
             FROM work_history WHERE user_id = $1 AND (company_id = $2 OR linkedin_source = $3::jsonb)`,
            [userId, company.rows[0].id, sourceKey],
          );
          const title = cleanCompany(entry.title).toLowerCase();
          const duplicate = existing.rows.some(row => {
            if (row.same_source) return true;
            const savedTitle = cleanCompany(row.title).toLowerCase();
            return (savedTitle === title && row.start === entry.start && row.end === entry.end) ||
              (savedTitle === source.title && !!source.start && row.start.startsWith(source.start) &&
                (source.end === null ? row.end === null : !!source.end && row.end?.startsWith(source.end)));
          });
          if (duplicate) throw new ConflictException("This LinkedIn position is already in your work history.");
        }
        await client.query(
          "INSERT INTO work_history (user_id, company_id, title, start_date, end_date, linkedin_source) VALUES ($1, $2, $3, $4, $5, $6)",
          [...data, sourceKey],
        );
      }
    });
  }

  async deleteWork(userId: string, entryId: string) {
    await this.db.limit("work:" + userId, 60);
    await this.db.transaction(async (client) => {
      await this.lockActiveAccount(client, userId);
      const removed = await client.query("DELETE FROM work_history WHERE user_id = $1 AND id = $2", [userId, entryId]);
      if (!removed.rowCount) throw new NotFoundException("Work history entry not found.");
    });
  }

  async setVisibility(userId: string, visible: boolean) {
    await this.db.limit("work:" + userId, 60);
    const result = await this.db.pool.query(
      "UPDATE users SET directory_visible = $2 WHERE id = $1 AND suspended_at IS NULL", [userId, visible],
    );
    if (!result.rowCount) throw new UnauthorizedException("Sign in to continue.");
  }

  async search(userId: string, term: string, eligibleOnly: boolean, page: number) {
    const pageSize = 50;
    const { rows } = await this.db.pool.query<{
      professionals: Array<{ id: string; name: string; eligible: boolean }>;
      hasWorkHistory: boolean;
    }>(
      `WITH candidates AS (
         SELECT u.id, u.name, EXISTS (
           SELECT 1 FROM work_history a JOIN work_history r ON r.company_id = a.company_id
           WHERE a.user_id = $1 AND r.user_id = u.id AND ${overlapStart} <= ${overlapEnd}
         ) AS eligible
         FROM users u
         WHERE u.directory_visible AND u.suspended_at IS NULL AND u.id <> $1 AND strpos(lower(u.name), lower($2)) > 0
       ), directory_page AS (
         SELECT id, name, eligible FROM candidates WHERE NOT $3 OR eligible
         ORDER BY name, id LIMIT $4 OFFSET $5
       )
       SELECT coalesce((SELECT jsonb_agg(p ORDER BY p.name, p.id) FROM directory_page p), '[]'::jsonb) AS professionals,
         EXISTS (SELECT 1 FROM work_history WHERE user_id = $1) AS "hasWorkHistory"`,
      [userId, term, eligibleOnly, pageSize + 1, (page - 1) * pageSize],
    );
    const { professionals, hasWorkHistory } = rows[0];
    return { professionals: professionals.slice(0, pageSize), hasMore: professionals.length > pageSize, hasWorkHistory };
  }

  async profile(userId: string, recipientId: string) {
    const result = await this.db.pool.query(
      "SELECT id, name FROM users WHERE id = $1 AND directory_visible AND suspended_at IS NULL AND id <> $2",
      [recipientId, userId],
    );
    const recipient = result.rows[0];
    if (!recipient) throw new NotFoundException("Colleague not found.");
    return { ...recipient, eligible: Boolean(await this.overlap(this.db.pool, userId, recipientId)) };
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

  async given(userId: string, recipientId: string) {
    const { rows } = await this.db.pool.query(
      `SELECT ${ratingFields}, u.name AS name, u.id AS "personId"
       FROM ratings r JOIN users u ON u.id = r.recipient_id WHERE r.author_id = $1 AND r.recipient_id = $2`,
      [userId, recipientId],
    );
    return rows[0] || null;
  }

  async saveRating(author: string, recipient: string, rating: ReturnType<typeof ratingInput>) {
    if (author === recipient) throw new ForbiddenException("You can rate another pilot participant.");
    await this.db.limit("rating:" + author, 30);

    return this.db.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      const { rows } = await client.query<{ id: string; directory_visible: boolean }>(
        `SELECT id, directory_visible FROM users WHERE id IN ($1, $2) AND suspended_at IS NULL
         ORDER BY id FOR NO KEY UPDATE`, [author, recipient],
      );
      if (!rows.some((row) => row.id === author)) throw new UnauthorizedException("Sign in to continue.");
      if (!rows.find((row) => row.id === recipient)?.directory_visible) {
        throw new NotFoundException("Colleague not found.");
      }
      const settings = await client.query<{ submissions_paused: boolean }>(
        "SELECT submissions_paused FROM pilot_settings WHERE id FOR SHARE",
      );
      if (settings.rows[0].submissions_paused) throw new ConflictException("Rating submissions are paused.");
      const evidence = await this.overlap(client, author, recipient);
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
        [author, recipient, rating.overall, rating.categories, rating.feedback, rating.anonymous, { ...evidence, version: 1 }],
      );
      return result.rows[0];
    });
  }

  async ratings(userId: string) {
    const [given, received] = await Promise.all([
      this.db.pool.query(
        `SELECT ${ratingFields}, u.name, u.id AS "personId",
           (u.directory_visible AND u.suspended_at IS NULL) AS "canOpenProfile"
         FROM ratings r JOIN users u ON u.id = r.recipient_id WHERE r.author_id = $1
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
