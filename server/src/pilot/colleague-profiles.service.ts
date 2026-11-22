import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { digest, newToken } from "../auth/auth.service";
import { clientOrigin } from "../config";
import { Database } from "../database/database";
import type { colleagueDraftInput } from "./inputs";
import { PilotService, sharedWork, workQuery } from "./pilot.service";
import { overlapsDraftWork, overlapsWorkEntry, ownsPrivateDraft, redeemedDraftInvite } from "./eligibility";

const draftIssuer = "eprorate:colleague-draft";
type ProfileInput = ReturnType<typeof colleagueDraftInput>;

@Injectable()
export class ColleagueProfilesService {
  constructor(private readonly db: Database, private readonly pilot: PilotService) {}

  async get(member: string, id: string) {
    const { rows: [profile] } = await this.db.pool.query(
      `SELECT p.id, coalesce(own.name,u.name) AS name, p.linkedin_profile_url AS "linkedinProfileUrl", p.revision,
        p.shared, (p.shared OR own.id IS NOT NULL) AS "canInvite",
        (p.shared OR ${redeemedDraftInvite("$2")}) AS "canClaim",
        coalesce((SELECT jsonb_agg(w) FROM (${workQuery}) w), '[]'::jsonb) AS history,
        ARRAY(SELECT r.id FROM work_history r WHERE r.user_id=p.id AND ${overlapsWorkEntry("$2")}) AS "overlappingRoleIds",
        (SELECT jsonb_build_object('code', c.code, 'submitted', coalesce(c.submitted_revision=p.revision, false))
         FROM colleague_profile_claims c WHERE c.profile_id=p.id AND c.claimant_id=$2
           AND c.expires_at > now() AND c.reviewed_at IS NULL) AS claim,
        (SELECT sender.name FROM invites i JOIN users sender ON sender.id=i.invited_by
         WHERE i.colleague_profile_id=p.id AND i.redeemed_by=$2
         ORDER BY i.redeemed_at DESC LIMIT 1) AS "invitedBy"
       FROM colleague_profiles p JOIN users u ON u.id=p.id
       LEFT JOIN colleague_drafts own ON own.owner_id=$2 AND own.linkedin_profile_url=p.linkedin_profile_url AND NOT p.shared
       WHERE p.id=$1 AND p.claimed_at IS NULL AND u.suspended_at IS NULL
         AND (p.shared OR own.id IS NOT NULL OR ${redeemedDraftInvite("$2")})`, [id, member],
    );
    if (!profile) throw new NotFoundException("This colleague draft is no longer available.");
    return profile;
  }

  private async lockDraft(client: PoolClient, id: string, member?: string) {
    const { rows: accounts } = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE id IN ($1,$2) AND suspended_at IS NULL ORDER BY id FOR NO KEY UPDATE",
      [id, member ?? null],
    );
    if (member && !accounts.some(account => account.id === member)) throw new UnauthorizedException("Sign in to continue.");
    if (!accounts.some(account => account.id === id)) throw new NotFoundException("This shared draft is no longer available.");
    const { rows: [draft] } = await client.query<{
      linkedin_profile_url: string; revision: number; shared: boolean; owns: boolean; invited: boolean;
    }>(
      `SELECT linkedin_profile_url, revision, shared, ${ownsPrivateDraft("$2")} AS owns, ${redeemedDraftInvite("$2")} AS invited
       FROM colleague_profiles p WHERE id=$1 AND claimed_at IS NULL`, [id, member ?? null],
    );
    if (!draft) throw new NotFoundException("This shared draft is no longer available.");
    return draft;
  }

  private async insertProfile(client: PoolClient, member: string, url: string, name: string, shared: boolean) {
    const { rows: [account] } = await client.query<{ id: string }>(
      "INSERT INTO users (issuer, subject, name) VALUES ($1,$2,$3) RETURNING id", [draftIssuer, url, name],
    );
    await client.query(
      "INSERT INTO colleague_profiles (id, linkedin_profile_url, created_by, shared) VALUES ($1,$2,$3,$4)",
      [account.id, url, member, shared],
    );
    return account.id;
  }

  async preparePrivateRating(member: string, draftId: string) {
    await this.db.limit("private-draft-rating:" + member, 40);
    return this.db.transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      const { rows: [initial] } = await client.query<{ linkedin_profile_url: string }>(
        "SELECT linkedin_profile_url FROM colleague_drafts WHERE id=$1 AND owner_id=$2", [draftId, member],
      );
      if (!initial) throw new NotFoundException("Colleague draft not found.");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [initial.linkedin_profile_url]);
      const account = await client.query("SELECT id FROM users WHERE id=$1 AND suspended_at IS NULL FOR NO KEY UPDATE", [member]);
      if (!account.rowCount) throw new UnauthorizedException("Sign in to continue.");
      const { rows: [draft] } = await client.query<{
        linkedin_profile_url: string; name: string; invitation_id: string | null; eligible: boolean;
      }>(
        `SELECT d.linkedin_profile_url, d.name, d.invitation_id, ${overlapsDraftWork("$2", "d.history")} AS eligible
         FROM colleague_drafts d WHERE d.id=$1 AND d.owner_id=$2 FOR UPDATE`, [draftId, member],
      );
      if (!draft) throw new NotFoundException("Colleague draft not found.");
      const url = draft.linkedin_profile_url;
      const { rows: [existing] } = await client.query<{
        id: string; claimed_by: string | null; claimed_at: Date | null; suspended_at: Date | null;
      }>(
        `SELECT p.id,p.claimed_by,p.claimed_at,u.suspended_at FROM colleague_profiles p
         JOIN users u ON u.id=p.id WHERE p.linkedin_profile_url=$1`, [url],
      );
      const { rows: [registered] } = await client.query<{ id: string; eligible: boolean }>(
        `SELECT u.id, u.id<>$1 AND u.suspended_at IS NULL AND ${sharedWork("$1", "u.id")} AS eligible
         FROM users u WHERE CASE WHEN $3::uuid IS NOT NULL THEN u.id=$3 ELSE u.linkedin_profile_url=$2 END
         ORDER BY eligible DESC,u.id LIMIT 1`, [member, url, existing?.claimed_by ?? null],
      );
      if (registered?.eligible) return { id: registered.id };
      if (registered || existing?.suspended_at || existing?.claimed_at) {
        throw new ForbiddenException("Ratings require overlapping saved work dates with an available colleague.");
      }
      if (!draft.eligible) throw new ForbiddenException("Your work dates must overlap at the same company.");
      const id = existing?.id ?? await this.insertProfile(client, member, url, draft.name, false);
      if (draft.invitation_id) {
        await client.query(
          "UPDATE invites SET colleague_profile_id=$2 WHERE id=$1 AND colleague_profile_id IS NULL", [draft.invitation_id, id],
        );
      }
      return { id };
    });
  }

  async create(member: string, input: ProfileInput) {
    await this.db.limit("shared-draft:" + member, 40);
    return this.db.transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      // A single creation per normalized URL, including simultaneous imports.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [input.linkedinProfileUrl]);
      const { rows: [existing] } = await client.query<{ id: string; available: boolean; shared: boolean }>(
        `SELECT p.id, (p.claimed_at IS NULL AND u.suspended_at IS NULL) AS available, p.shared
         FROM colleague_profiles p JOIN users u ON u.id=p.id WHERE p.linkedin_profile_url=$1`,
        [input.linkedinProfileUrl],
      );
      if (existing && !existing.available) throw new ConflictException("This LinkedIn profile already belongs to a member or is unavailable.");
      if (existing?.shared) return { id: existing.id, created: false };
      const linked = await client.query("SELECT 1 FROM users WHERE linkedin_profile_url=$1", [input.linkedinProfileUrl]);
      if (linked.rowCount) throw new ConflictException("This LinkedIn profile is already linked to a member account.");
      let id: string;
      if (existing) {
        await this.lockDraft(client, existing.id, member);
        id = existing.id;
        await client.query("UPDATE colleague_profiles SET shared=true, revision=revision+1 WHERE id=$1", [id]);
        await client.query("UPDATE users SET name=$2 WHERE id=$1", [id, input.name]);
      } else {
        const creator = await client.query("SELECT id FROM users WHERE id=$1 AND suspended_at IS NULL FOR NO KEY UPDATE", [member]);
        if (!creator.rowCount) throw new UnauthorizedException("Sign in to continue.");
        id = await this.insertProfile(client, member, input.linkedinProfileUrl, input.name, true);
      }
      await this.pilot.replaceDraftWork(client, id, input.history);
      return { id, created: true };
    });
  }

  async edit(member: string, id: string, revision: number, input: ProfileInput) {
    await this.db.limit("shared-draft:" + member, 40);
    await this.db.transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      const draft = await this.lockDraft(client, id, member);
      if (!draft.shared) throw new NotFoundException("Shared colleague draft not found.");
      if (draft.linkedin_profile_url !== input.linkedinProfileUrl) throw new BadRequestException("The LinkedIn profile link is fixed for this draft.");
      const updated = await client.query("UPDATE colleague_profiles SET revision=revision+1 WHERE id=$1 AND revision=$2", [id, revision]);
      if (!updated.rowCount) throw new ConflictException("Someone edited this draft. Reload it to review the latest version.");
      await client.query("UPDATE users SET name=$2 WHERE id=$1", [id, input.name]);
      await this.pilot.replaceDraftWork(client, id, input.history);
    });
  }

  async invite(member: string, id: string) {
    await this.db.limit("shared-draft-invite:" + member, 20);
    const token = newToken();
    const url = clientOrigin() + "/#invite=" + token;
    return this.db.transaction(async client => {
      const draft = await this.lockDraft(client, id, member);
      if (!draft.shared && !draft.owns) throw new NotFoundException("Colleague draft not found.");
      const { rows: [invitation] } = await client.query<{ expiresAt: Date }>(
        `INSERT INTO invites (digest, role, expires_at, colleague_profile_id, invited_by)
         VALUES ($1,'participant',now() + interval '7 days',$2,$3) RETURNING expires_at AS "expiresAt"`,
        [digest(token), id, member],
      );
      await client.query("UPDATE pilot_activity_counts SET invites_issued=invites_issued+1 WHERE id");
      return { url, ...invitation };
    });
  }

  async startClaim(member: string, profile: string) {
    await this.db.limit("colleague-claim:" + member, 15);
    return this.db.transaction(async client => {
      const draft = await this.lockDraft(client, profile, member);
      if (!draft.shared && !draft.invited) throw new NotFoundException("Colleague draft not found.");
      const { rows: [claim] } = await client.query<{ code: string; submitted: boolean }>(
        `INSERT INTO colleague_profile_claims (profile_id, claimant_id, code, expires_at)
         VALUES ($1,$2,$3,now() + interval '7 days')
         ON CONFLICT (profile_id, claimant_id) DO UPDATE SET
           code=EXCLUDED.code, expires_at=EXCLUDED.expires_at, submitted_at=NULL, submitted_revision=NULL,
           reviewed_at=NULL, reviewed_by=NULL, approved=NULL
         WHERE colleague_profile_claims.expires_at <= now() OR colleague_profile_claims.reviewed_at IS NOT NULL
         RETURNING code, false AS submitted`, [profile, member, "EPR-" + randomBytes(12).toString("base64url")],
      );
      if (claim) return claim;
      const { rows: [current] } = await client.query(
        `SELECT c.code, coalesce(c.submitted_revision=p.revision,false) AS submitted
         FROM colleague_profile_claims c JOIN colleague_profiles p ON p.id=c.profile_id
         WHERE c.profile_id=$1 AND c.claimant_id=$2`, [profile, member],
      );
      return current;
    });
  }

  async submitClaim(member: string, id: string, revision: unknown) {
    await this.db.limit("colleague-claim:" + member, 15);
    await this.db.transaction(async client => {
      const draft = await this.lockDraft(client, id, member);
      if (!draft.shared && !draft.invited) throw new NotFoundException("Colleague draft not found.");
      if (draft.revision !== revision) throw new ConflictException("The work history changed. Reload the draft and review it before submitting.");
      const result = await client.query(
        `UPDATE colleague_profile_claims
         SET submitted_at=CASE WHEN submitted_revision=$3 THEN submitted_at ELSE now() END, submitted_revision=$3
         WHERE profile_id=$1 AND claimant_id=$2 AND expires_at>now() AND reviewed_at IS NULL`, [id, member, draft.revision],
      );
      if (!result.rowCount) throw new ConflictException("Start a new verification to get a valid code.");
    });
  }

  async claims(page: number) {
    const pageSize = 25;
    const { rows } = await this.db.pool.query(
      `SELECT c.id, draft.name, p.linkedin_profile_url AS "linkedinProfileUrl", member.name AS "claimantName",
         c.submitted_at AS "submittedAt"
       FROM colleague_profile_claims c JOIN colleague_profiles p ON p.id=c.profile_id
       JOIN users draft ON draft.id=p.id JOIN users member ON member.id=c.claimant_id
       WHERE c.reviewed_at IS NULL AND c.submitted_at IS NOT NULL AND c.expires_at>now()
         AND c.submitted_revision=p.revision AND p.claimed_at IS NULL
         AND draft.suspended_at IS NULL AND member.suspended_at IS NULL
       ORDER BY c.submitted_at, c.id LIMIT $1 OFFSET $2`, [pageSize + 1, (page - 1) * pageSize],
    );
    return { claims: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
  }

  async review(operator: string, id: string, observedCode: string | null) {
    await this.db.limit("colleague-claim-review:" + operator, 40);
    await this.db.transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock_shared(114010, 2)");
      const { rows: [ids] } = await client.query<{ profile_id: string; claimant_id: string }>(
        "SELECT profile_id, claimant_id FROM colleague_profile_claims WHERE id=$1", [id],
      );
      if (!ids) throw new NotFoundException("Verification request not found.");
      const { profile_id: profile, claimant_id: claimant } = ids;
      if (operator === claimant) throw new BadRequestException("Another administrator must review your own request.");
      // Ratings acquire the same account locks in the same order.
      const accounts = await client.query(
        "SELECT id FROM users WHERE id IN ($1,$2) AND suspended_at IS NULL ORDER BY id FOR NO KEY UPDATE",
        [profile, claimant],
      );
      if (accounts.rowCount !== 2) throw new ConflictException("This profile or member is unavailable.");
      const draft = await this.lockDraft(client, profile);
      const { rows: [claim] } = await client.query<{ code: string }>(
        `SELECT code FROM colleague_profile_claims WHERE id=$1 AND submitted_at IS NOT NULL
         AND submitted_revision=$2 AND expires_at>now() AND reviewed_at IS NULL`, [id, draft.revision],
      );
      if (!claim) throw new ConflictException("This verification is no longer pending.");
      if (observedCode !== null && observedCode !== claim.code) {
        throw new BadRequestException("That code does not match the verification request.");
      }
      await client.query(
        "UPDATE colleague_profile_claims SET reviewed_at=now(), reviewed_by=$2, approved=$3 WHERE id=$1",
        [id, operator, observedCode !== null],
      );
      if (observedCode === null) return;

      await client.query(
        `INSERT INTO work_history (user_id, company_id, title, start_date, end_date)
         SELECT $2, w.company_id, w.title, w.start_date, w.end_date FROM work_history w WHERE w.user_id=$1
         AND NOT EXISTS (
           SELECT 1 FROM work_history existing
           WHERE existing.user_id=$2 AND existing.company_id=w.company_id AND lower(existing.title)=lower(w.title)
             AND existing.start_date=w.start_date AND existing.end_date IS NOT DISTINCT FROM w.end_date
         )`, [profile, claimant],
      );
      // Preserve existing member ratings if the same author rated both profiles separately.
      await client.query(
        `UPDATE ratings draft SET recipient_id=$2 WHERE draft.recipient_id=$1 AND draft.author_id<>$2
         AND NOT EXISTS (SELECT 1 FROM ratings existing WHERE existing.recipient_id=$2 AND existing.author_id=draft.author_id)`,
        [profile, claimant],
      );
      await client.query("DELETE FROM work_history WHERE user_id=$1", [profile]);
      await client.query("UPDATE users SET suspended_at=now() WHERE id=$1", [profile]);
      await client.query(
        "UPDATE users SET linkedin_profile_url=$2 WHERE id=$1 AND linkedin_profile_url IS NULL",
        [claimant, draft.linkedin_profile_url],
      );
      await client.query("UPDATE colleague_profiles SET claimed_by=$2, claimed_at=now() WHERE id=$1", [profile, claimant]);
      await client.query("UPDATE invites SET revoked_at=now() WHERE colleague_profile_id=$1 AND redeemed_at IS NULL AND revoked_at IS NULL", [profile]);
    });
  }
}
