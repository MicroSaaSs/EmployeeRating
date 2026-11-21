import { Injectable, Logger } from "@nestjs/common";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { linkedInConfig } from "../config";

const linkedInOrigin = "https://www.linkedin.com";
// Use the issuer from LinkedIn's OpenID configuration, which includes the /oauth path.
const issuer = linkedInOrigin + "/oauth";
const keys = createRemoteJWKSet(new URL("/oauth/openid/jwks", linkedInOrigin), { timeoutDuration: 5000 });

export interface MemberIdentity {
  issuer: string;
  subject: string;
  name: string;
}

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);

  authorizationUrl(state: string) {
    const { clientId, redirectUri } = linkedInConfig();
    const url = new URL("/oauth/v2/authorization", linkedInOrigin);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid profile",
      state,
    }).toString();
    return url.toString();
  }

  async verify(code: string): Promise<MemberIdentity> {
    const { clientId, clientSecret, redirectUri } = linkedInConfig();
    const response = await fetch(new URL("/oauth/v2/accessToken", linkedInOrigin), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!response.ok) {
      this.logger.warn(`LinkedIn token endpoint returned HTTP ${response.status}`);
      throw new Error("LinkedIn token exchange failed");
    }
    const { id_token } = await response.json() as { id_token?: unknown };
    if (typeof id_token !== "string") throw new Error("LinkedIn did not return an ID token");

    const { payload } = await jwtVerify(id_token, keys, {
      issuer,
      audience: clientId,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "iat", "exp"],
      maxTokenAge: "10 minutes",
      clockTolerance: 30,
    }).catch((error: unknown) => {
      const reason = error instanceof errors.JOSEError ? error.code : "verification error";
      this.logger.warn(`LinkedIn ID token validation failed (${reason})`);
      throw error;
    });
    if (!payload.sub || (Array.isArray(payload.aud) && payload.aud.length > 1)) {
      throw new Error("LinkedIn token did not match this sign-in");
    }
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "E-ProRate member";
    return { issuer, subject: payload.sub, name: name.slice(0, 150) };
  }
}
