import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import type { Request } from "express";
import { Database } from "../database/database";
import { LinkedInService } from "./linkedin.service";

export const sessionHours = 24 * 7;
export const attemptMinutes = 10;
export const newToken = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const isToken = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

export interface SessionUser {
  id: string;
  name: string;
  role: "participant" | "operator";
}

export class AccountSuspendedException extends ForbiddenException {
  constructor() {
    super("This account is suspended.");
  }
}

@Injectable()
export class AuthService {
  constructor(private readonly db: Database, private readonly linkedIn: LinkedInService) {}

  async start(invite: unknown) {
    if (invite !== undefined && !isToken(invite)) throw new BadRequestException("This invitation link is invalid.");
    const state = newToken();
    const browser = newToken();
    const url = this.linkedIn.authorizationUrl(state);
    await this.db.pool.query(
      `WITH started AS (
         INSERT INTO oauth_attempts (state_digest, browser_digest, invite_digest, expires_at, counted)
         VALUES ($1, $2, $3, now() + $4 * interval '1 minute', true)
       )
       UPDATE pilot_activity_counts SET sign_ins_started = sign_ins_started + 1 WHERE id`,
      [digest(state), digest(browser), invite ? digest(invite) : null, attemptMinutes],
    );
    return { url, browser };
  }

  async complete(code: unknown, state: unknown, browser: unknown, previousSession: unknown) {
    if (typeof code !== "string" || !code || code.length > 4096 || !isToken(state) || !isToken(browser)) {
      throw new BadRequestException("This sign-in attempt is invalid.");
    }
    const { rows } = await this.db.pool.query<{ invite_digest: string | null; counted: boolean }>(
      `DELETE FROM oauth_attempts WHERE state_digest = $1 AND browser_digest = $2 AND expires_at > now()
       RETURNING invite_digest, counted`, [digest(state), digest(browser)],
    );
    const attempt = rows[0];
    if (!attempt) throw new BadRequestException("This sign-in attempt expired or was already used.");

    const identity = await this.linkedIn.verify(code);
    const session = newToken();
    const colleagueProfileId = await this.db.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [identity.issuer + ":" + identity.subject]);
      const { rows: [existing] } = await client.query<{ id: string; role: SessionUser["role"]; suspended_at: Date | null }>(
        "SELECT id, role, suspended_at FROM users WHERE issuer = $1 AND subject = $2 FOR NO KEY UPDATE",
        [identity.issuer, identity.subject],
      );
      if (existing?.suspended_at) throw new AccountSuspendedException();

      type ActiveInvite = Pick<SessionUser, "id" | "role"> & { colleague_profile_id: string | null };
      let invitation: ActiveInvite | undefined;
      if (attempt.invite_digest) {
        const { rows: [activeInvite] } = await client.query<ActiveInvite>(
          `SELECT id, role, colleague_profile_id FROM invites
           WHERE digest = $1 AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
           FOR UPDATE`, [attempt.invite_digest],
        );
        if (!activeInvite || (activeInvite.role === "operator" && existing?.role === "participant")) {
          throw new ForbiddenException("This invitation could not be applied.");
        }
        invitation = activeInvite;
      }

      let userId = existing?.id;
      if (!userId) {
        const created = await client.query<{ id: string }>(
          "INSERT INTO users (issuer, subject, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
          [identity.issuer, identity.subject, identity.name, invitation?.role ?? "participant"],
        );
        userId = created.rows[0].id;
      }
      if (invitation) {
        await client.query("UPDATE invites SET redeemed_at = now(), redeemed_by = $2 WHERE id = $1", [invitation.id, userId]);
      }
      if (isToken(previousSession)) await client.query("DELETE FROM sessions WHERE digest = $1", [digest(previousSession)]);
      await client.query(
        "INSERT INTO sessions (digest, user_id, expires_at) VALUES ($1, $2, now() + $3 * interval '1 hour')",
        [digest(session), userId, sessionHours],
      );
      await client.query(
        `UPDATE pilot_activity_counts SET sign_ins_completed = sign_ins_completed + $1,
           invites_redeemed = invites_redeemed + $2 WHERE id`,
        [Number(attempt.counted), Number(Boolean(invitation))],
      );
      return invitation?.colleague_profile_id ?? null;
    });
    return { session, colleagueProfileId };
  }

  async sessionUser(req: Request): Promise<SessionUser | undefined> {
    const session = req.cookies?.sid;
    if (!isToken(session)) return undefined;
    const { rows } = await this.db.pool.query<SessionUser>(
      `SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.digest = $1 AND s.expires_at > now() AND u.suspended_at IS NULL`, [digest(session)],
    );
    return rows[0];
  }

  async requireUser(req: Request): Promise<SessionUser> {
    const user = await this.sessionUser(req);
    if (!user) throw new UnauthorizedException("Sign in to continue.");
    return user;
  }

  async requireOperator(req: Request): Promise<SessionUser> {
    const user = await this.requireUser(req);
    if (user.role !== "operator") throw new ForbiddenException();
    return user;
  }

  async logout(session: unknown) {
    if (isToken(session)) await this.db.pool.query("DELETE FROM sessions WHERE digest = $1", [digest(session)]);
  }
}
