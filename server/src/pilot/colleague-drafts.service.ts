import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { digest, newToken } from "../auth/auth.service";
import { clientOrigin } from "../config";
import { Database } from "../database/database";
import type { colleagueDraftInput } from "./inputs";
import { cleanCompany } from "./companies";
import { draftWorkEntries, overlapsWorkEntry } from "./eligibility";

const invitationStatus = `CASE WHEN i.id IS NULL THEN 'requested'
  WHEN i.revoked_at IS NOT NULL THEN 'revoked'
  WHEN i.redeemed_at IS NOT NULL THEN 'redeemed'
  WHEN i.expires_at <= now() THEN 'expired' ELSE 'issued' END`;

@Injectable()
export class ColleagueDraftsService {
  constructor(private readonly db: Database) {}

  async list(ownerId: string) {
    const { rows } = await this.db.pool.query(
      `SELECT d.id, d.name, d.linkedin_profile_url AS "linkedinProfileUrl", d.history,
        ARRAY(
          SELECT (r.position - 1)::integer
          FROM (${draftWorkEntries("d.history")}) r
          WHERE ${overlapsWorkEntry("$1")}
          ORDER BY r.position
        ) AS "overlappingRoleIndexes",
        d.invitation_requested_at IS NULL AS "canEdit", d.invitation_id AS "invitationId",
        CASE WHEN d.invitation_requested_at IS NULL AND d.invitation_id IS NULL
          THEN 'draft' ELSE ${invitationStatus} END AS "invitationStatus"
       FROM colleague_drafts d LEFT JOIN invites i ON i.id = d.invitation_id
       WHERE d.owner_id = $1 ORDER BY d.updated_at DESC, d.id`, [ownerId],
    );
    return rows;
  }

  async overlap(ownerId: string, history: ReturnType<typeof colleagueDraftInput>["history"]) {
    await this.db.limit("colleague-overlap:" + ownerId, 60);
    const { rows } = await this.db.pool.query(
      `WITH imported AS (
         SELECT * FROM jsonb_to_recordset($2::jsonb) AS item(company text, start date, "end" date)
       ), matched AS (
         SELECT c.name AS company, greatest(w.start_date, i.start) AS start,
           least(coalesce(w.end_date, (now() AT TIME ZONE 'UTC')::date),
                 coalesce(i."end", (now() AT TIME ZONE 'UTC')::date)) AS "end"
         FROM imported i
         LEFT JOIN company_aliases alias ON alias.name_key = i.company
         JOIN companies c ON c.id=alias.company_id OR (alias.company_id IS NULL AND c.name_key=i.company)
         JOIN work_history w ON w.company_id=c.id AND w.user_id=$1
       )
       SELECT DISTINCT company, start::text, "end"::text FROM matched WHERE start <= "end" ORDER BY company, start, "end"`,
      [ownerId, JSON.stringify(history.map(role => ({ company: cleanCompany(role.company).toLowerCase(), start: role.start, end: role.end })))],
    );
    return { matches: rows };
  }

  async save(ownerId: string, draft: ReturnType<typeof colleagueDraftInput>) {
    await this.db.limit("colleague-draft:" + ownerId, 40);
    return this.db.transaction(async client => {
      const owner = await client.query("SELECT id FROM users WHERE id=$1 AND suspended_at IS NULL FOR NO KEY UPDATE", [ownerId]);
      if (!owner.rowCount) throw new UnauthorizedException("Sign in to continue.");
      const { rows } = await client.query(
        `INSERT INTO colleague_drafts (owner_id, linkedin_profile_url, name, history) VALUES ($1,$2,$3,$4)
         ON CONFLICT (owner_id, linkedin_profile_url) DO UPDATE
         SET name=EXCLUDED.name, history=EXCLUDED.history, updated_at=now()
         WHERE colleague_drafts.invitation_requested_at IS NULL RETURNING id`,
        [ownerId, draft.linkedinProfileUrl, draft.name, JSON.stringify(draft.history)],
      );
      if (!rows[0]) throw new ConflictException("This colleague already has an invitation request. View the saved draft.");
      return rows[0];
    });
  }

  async remove(ownerId: string, id: string) {
    const result = await this.db.pool.query("DELETE FROM colleague_drafts WHERE id=$1 AND owner_id=$2", [id, ownerId]);
    if (!result.rowCount) throw new NotFoundException("Colleague draft not found.");
  }

  async requestInvite(ownerId: string, id: string) {
    await this.db.limit("colleague-invite-request:" + ownerId, 20);
    await this.db.transaction(async client => {
      const owner = await client.query("SELECT id FROM users WHERE id=$1 AND suspended_at IS NULL FOR NO KEY UPDATE", [ownerId]);
      if (!owner.rowCount) throw new UnauthorizedException("Sign in to continue.");
      const { rows: [draft] } = await client.query<{ invitation_requested_at: Date | null; invitation_id: string | null; can_request: boolean }>(
        `SELECT d.invitation_requested_at, d.invitation_id,
           (i.revoked_at IS NOT NULL OR (i.expires_at <= now() AND i.redeemed_at IS NULL)) AS can_request
         FROM colleague_drafts d LEFT JOIN invites i ON i.id=d.invitation_id
         WHERE d.owner_id=$1 AND d.id=$2 FOR UPDATE OF d`, [ownerId, id],
      );
      if (!draft) throw new NotFoundException("Colleague draft not found.");
      if ((draft.invitation_requested_at || draft.invitation_id) && !draft.can_request) {
        throw new ConflictException("This draft already has an invitation request or link.");
      }
      await client.query(
        "UPDATE colleague_drafts SET invitation_requested_at=now(), invitation_id=NULL, updated_at=now() WHERE id=$1", [id],
      );
    });
  }

  async createInvitationLink(ownerId: string, id: string, replaceId: string | undefined) {
    await this.db.limit("colleague-invite-request:" + ownerId, 20);
    const token = newToken();
    const url = clientOrigin() + "/#invite=" + token;
    return this.db.transaction(async client => {
      const owner = await client.query("SELECT id FROM users WHERE id=$1 AND suspended_at IS NULL FOR NO KEY UPDATE", [ownerId]);
      if (!owner.rowCount) throw new UnauthorizedException("Sign in to continue.");
      const { rows: [draft] } = await client.query<{ invitation_id: string | null; linkedin_profile_url: string }>(
        "SELECT invitation_id, linkedin_profile_url FROM colleague_drafts WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, ownerId],
      );
      if (!draft) throw new NotFoundException("Colleague draft not found.");
      if (draft.invitation_id) {
        const { rows: [previous] } = await client.query<{ redeemed_at: Date | null; active: boolean }>(
          "SELECT redeemed_at, revoked_at IS NULL AND expires_at>now() AS active FROM invites WHERE id=$1 FOR UPDATE",
          [draft.invitation_id],
        );
        if (previous?.redeemed_at) throw new ConflictException("This invitation was already accepted.");
        if (previous?.active && draft.invitation_id !== replaceId) {
          throw new ConflictException("This draft already has an invitation link. Refresh the page to replace it.");
        }
        await client.query(
          "UPDATE invites SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()", [draft.invitation_id],
        );
      }
      const { rows: [invitation] } = await client.query<{ id: string; expiresAt: Date }>(
        `INSERT INTO invites (digest, role, expires_at, invited_by, colleague_profile_id)
         VALUES ($1,'participant',now() + interval '7 days',$2,
           (SELECT id FROM colleague_profiles WHERE linkedin_profile_url=$3 AND claimed_at IS NULL))
         RETURNING id, expires_at AS "expiresAt"`,
        [digest(token), ownerId, draft.linkedin_profile_url],
      );
      await client.query(
        "UPDATE colleague_drafts SET invitation_id=$2, invitation_requested_at=NULL WHERE id=$1",
        [id, invitation.id],
      );
      await client.query("UPDATE pilot_activity_counts SET invites_issued=invites_issued+1 WHERE id");
      return { url, expiresAt: invitation.expiresAt };
    });
  }

  async requests(page: number) {
    const pageSize = 25;
    const { rows } = await this.db.pool.query(
      `SELECT d.id, d.name, d.linkedin_profile_url AS "linkedinProfileUrl", u.name AS "requestedBy",
         d.invitation_requested_at AS "requestedAt"
       FROM colleague_drafts d JOIN users u ON u.id=d.owner_id
       WHERE d.invitation_requested_at IS NOT NULL AND d.invitation_id IS NULL AND u.suspended_at IS NULL
       ORDER BY d.invitation_requested_at, d.id LIMIT $1 OFFSET $2`, [pageSize + 1, (page - 1) * pageSize],
    );
    return { requests: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
  }
}
