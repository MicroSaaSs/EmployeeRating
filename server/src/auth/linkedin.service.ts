import { Injectable } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { linkedInConfig } from "../config";

const issuer = "https://www.linkedin.com";
const keys = createRemoteJWKSet(new URL(issuer + "/oauth/openid/jwks"), { timeoutDuration: 5000 });

export interface MemberIdentity {
  issuer: string;
  subject: string;
  name: string;
}

@Injectable()
export class LinkedInService {
  authorizationUrl(state: string) {
    const { clientId, redirectUri } = linkedInConfig();
    const url = new URL("/oauth/v2/authorization", issuer);
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
    const response = await fetch(new URL("/oauth/v2/accessToken", issuer), {
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
    if (!response.ok) throw new Error("LinkedIn token exchange failed");
    const { id_token } = await response.json() as { id_token?: unknown };
    if (typeof id_token !== "string") throw new Error("LinkedIn did not return an ID token");

    const { payload } = await jwtVerify(id_token, keys, {
      issuer,
      audience: clientId,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "iat", "exp"],
      maxTokenAge: "10 minutes",
      clockTolerance: 30,
    });
    if (!payload.sub || (Array.isArray(payload.aud) && payload.aud.length > 1)) {
      throw new Error("LinkedIn token did not match this sign-in");
    }
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "Pilot participant";
    return { issuer, subject: payload.sub, name: name.slice(0, 150) };
  }
}
