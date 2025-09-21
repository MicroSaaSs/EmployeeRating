import { Injectable, Logger } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import axios from "axios";
import { nanoid } from "nanoid";

const SESSIONS = new Map<string, any>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly users: UsersService) {}
  private get clientId() {
    return process.env.LINKEDIN_CLIENT_ID || "";
  }
  private get clientSecret() {
    return process.env.LINKEDIN_CLIENT_SECRET || "";
  }
  private get redirectUri() {
    return (
      process.env.LINKEDIN_REDIRECT_URI ||
      "http://localhost:3000/auth/linkedin/callback"
    );
  }

  buildAuthorizationUrl() {
    const state = nanoid(16);
    // Use OIDC self-serve sign-in scopes
    const scopes = ["openid", "profile", "email"];
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(" "),
      state,
    });
    this.logger.debug(
      `Building authorization URL with redirectUri=${
        this.redirectUri
      } scopes=${scopes.join(",")}`
    );
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleCallback({ code, state }: { code: string; state: string }) {
    if (!code) throw new Error("Missing code");
    this.logger.log(
      "Handling LinkedIn callback: exchanging code for access token"
    );
    // Exchange code for token
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token as string;
    this.logger.debug("Access token received from LinkedIn (OIDC)");

    // Fetch OIDC userinfo (works with openid profile email)
    this.logger.log("Fetching LinkedIn OIDC userinfo");
    const userinfo = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = {
      id: userinfo.data?.sub,
      firstName: userinfo.data?.given_name,
      lastName: userinfo.data?.family_name,
      email: userinfo.data?.email,
      avatar: userinfo.data?.picture,
    };
    // Persist/update user in memory
    this.users.upsert(user);

    const sid = nanoid(18);
    SESSIONS.set(sid, { user, accessToken });
    this.logger.log(`Session created for user ${user.id} sid=${sid}`);
    return { sid, user };
  }

  async createSession(user: any) {
    const sid = nanoid(18);
    SESSIONS.set(sid, { user });
    this.logger.log(`Ephemeral session created sid=${sid}`);
    return { sid, user };
  }

  getSessionBySid(sid?: string | null) {
    if (!sid) return null;
    return SESSIONS.get(sid) || null;
  }

  destroySession(sid?: string | null) {
    if (!sid) return false;
    const existed = SESSIONS.delete(sid);
    if (existed) this.logger.log(`Session destroyed sid=${sid}`);
    return existed;
  }
}
