import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { digest, newToken, type SessionUser } from "../auth/auth.service";
import { clientOrigin } from "../config";
import { Database } from "../database/database";
import { linkCompanyName, previewCompanyLink, searchCompanies } from "./companies";
import { overlapStart, overlapEnd } from "./eligibility";

export interface Invitation {
  id: string;
  role: SessionUser["role"];
  expiresAt: Date;
  status: "active" | "redeemed" | "expired" | "revoked";
}

export interface PilotMetrics {
  signInsMeasuredFrom: Date;
  signInsStarted: number;
  signInsCompleted: number;
  invitesIssued: number;
  invitesRedeemed: number;
  accounts: number;
  accountsWithHistory: number;
  directoryParticipants: number;
  accountsWithEligibleColleague: number;
  ratings: number;
  ratingsOpened: number;
  distinctRatedPairs: number;
  reports: number;
  openReports: number;
  averageReportResponseSeconds: number | null;
}

export interface PilotAccount {
  id: string;
  name: string;
  suspendedAt: Date | null;
}

@Injectable()
export class PilotOperationsService {
  constructor(private readonly db: Database) {}

  async issueInvite(role: SessionUser["role"], rateLimitKey: string, requestId: string | null = null) {
    const origin = clientOrigin();
    await this.db.limit("invite:" + rateLimitKey, 50);
    const token = newToken();
    const { rows } = await this.db.pool.query<Pick<Invitation, "id" | "expiresAt">>(
      `WITH requested AS (
         SELECT d.id FROM colleague_drafts d JOIN users u ON u.id=d.owner_id
         WHERE d.id=$3 AND d.invitation_requested_at IS NOT NULL AND d.invitation_id IS NULL
           AND u.suspended_at IS NULL FOR UPDATE OF d
       ), issued AS (
         INSERT INTO invites (digest, role, expires_at)
         SELECT $1,$2,now() + interval '7 days' WHERE $3::uuid IS NULL OR EXISTS (SELECT 1 FROM requested)
         RETURNING id, expires_at AS "expiresAt"
       ), recorded AS (
         UPDATE pilot_activity_counts SET invites_issued = invites_issued + (SELECT count(*) FROM issued) WHERE id
       ), attached AS (
         UPDATE colleague_drafts SET invitation_id=issued.id FROM issued WHERE colleague_drafts.id=$3
       )
       SELECT id, "expiresAt" FROM issued`, [digest(token), role, requestId],
    );
    if (!rows[0]) throw new ConflictException("This invitation request is no longer pending.");
    return { ...rows[0], url: origin + "/#invite=" + token };
  }

  async invitations() {
    const { rows } = await this.db.pool.query<Invitation>(
      `SELECT id, role, expires_at AS "expiresAt",
         CASE WHEN revoked_at IS NOT NULL THEN 'revoked'
              WHEN redeemed_at IS NOT NULL THEN 'redeemed'
              WHEN expires_at <= now() THEN 'expired'
              ELSE 'active' END AS status
       FROM invites ORDER BY (redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > now()) DESC,
         expires_at DESC, id`,
    );
    return rows;
  }

  async revokeInvite(id: string) {
    const result = await this.db.pool.query(
      `UPDATE invites SET revoked_at = now()
       WHERE id = $1 AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > now()`, [id],
    );
    if (!result.rowCount) throw new ConflictException("Only an active unused invitation can be revoked.");
  }

  companies(term: string, page: number) {
    return searchCompanies(this.db, term, page);
  }

  previewCompanyAlias(canonical: string, alias: string) {
    return previewCompanyLink(this.db, canonical, alias);
  }

  async saveCompanyAlias(operatorId: string, canonical: string, alias: string) {
    await this.db.limit("company-link:" + operatorId, 30);
    return linkCompanyName(this.db, canonical, alias);
  }

  async accounts(term: string, suspendedOnly: boolean, page: number) {
    const pageSize = 30;
    const { rows } = await this.db.pool.query<PilotAccount>(
      `SELECT id, name, suspended_at AS "suspendedAt" FROM users
       WHERE role = 'participant' AND (NOT $2 OR suspended_at IS NOT NULL)
         AND (strpos(lower(name), lower($1)) > 0 OR id::text = lower($1))
       ORDER BY name, id LIMIT $3 OFFSET $4`, [term, suspendedOnly, pageSize + 1, (page - 1) * pageSize],
    );
    return { accounts: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
  }

  async accountHistory(userId: string) {
    const account = await this.db.pool.query("SELECT 1 FROM users WHERE id = $1 AND role = 'participant'", [userId]);
    if (!account.rowCount) throw new NotFoundException("Participant account not found.");

    const { rows } = await this.db.pool.query(
      `SELECT a.id::text, a.action, a.note, a.created_at AS "createdAt", u.name AS operator
       FROM account_access_actions a LEFT JOIN users u ON u.id = a.operator_id
       WHERE a.user_id = $1 ORDER BY a.id DESC`, [userId],
    );
    return rows;
  }

  async setAccountAccess(operator: string, userId: string, suspend: boolean, note: string) {
    await this.db.transaction(async (client) => {
      const { rows } = await client.query<{ suspended: boolean }>(
        `SELECT suspended_at IS NOT NULL AS suspended FROM users
         WHERE id = $1 AND role = 'participant' FOR NO KEY UPDATE`, [userId],
      );
      if (!rows[0]) throw new NotFoundException("Participant account not found.");
      if (rows[0].suspended === suspend) throw new ConflictException("This account already has that access status.");

      await client.query(
        "UPDATE users SET suspended_at = CASE WHEN $2 THEN clock_timestamp() END WHERE id = $1", [userId, suspend],
      );
      if (suspend) await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
      await client.query(
        "INSERT INTO account_access_actions (user_id, operator_id, action, note) VALUES ($1, $2, $3, $4)",
        [userId, operator, suspend ? "suspend" : "restore", note],
      );
    });
  }

  async metrics() {
    const { rows } = await this.db.pool.query<PilotMetrics>(`
      WITH participants AS (SELECT id, directory_visible FROM users WHERE role = 'participant' AND suspended_at IS NULL)
      SELECT
        measured_from AS "signInsMeasuredFrom",
        sign_ins_started::float8 AS "signInsStarted",
        sign_ins_completed::float8 AS "signInsCompleted",
        invites_issued::float8 AS "invitesIssued",
        invites_redeemed::float8 AS "invitesRedeemed",
        (SELECT count(*)::float8 FROM participants) AS accounts,
        (SELECT count(*)::float8 FROM participants WHERE directory_visible) AS "directoryParticipants",
        (SELECT count(*)::float8 FROM participants p
         WHERE EXISTS (SELECT 1 FROM work_history WHERE user_id = p.id)) AS "accountsWithHistory",
        (SELECT count(*)::float8 FROM participants p WHERE EXISTS (
          SELECT 1 FROM work_history a JOIN work_history r ON r.company_id = a.company_id
          JOIN users colleague ON colleague.id = r.user_id
          WHERE a.user_id = p.id AND colleague.id <> p.id AND colleague.directory_visible AND colleague.suspended_at IS NULL
            AND ${overlapStart} <= ${overlapEnd}
        )) AS "accountsWithEligibleColleague",
        (SELECT count(*)::float8 FROM ratings) AS ratings,
        (SELECT count(first_opened_at)::float8 FROM ratings) AS "ratingsOpened",
        (SELECT count(*)::float8 FROM (
          SELECT DISTINCT least(author_id, recipient_id), greatest(author_id, recipient_id) FROM ratings
        ) pairs) AS "distinctRatedPairs",
        (SELECT count(*)::float8 FROM reports) AS reports,
        (SELECT count(*)::float8 FROM reports WHERE status = 'open') AS "openReports",
        (SELECT avg(extract(epoch FROM responded_at - created_at))::float8 FROM reports) AS "averageReportResponseSeconds"
      FROM pilot_activity_counts WHERE id`);
    return rows[0];
  }
}
