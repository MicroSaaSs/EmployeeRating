export function clientOrigin() {
  const url = new URL(process.env.CLIENT_APP_URL || "http://localhost:4028");
  if (url.href !== url.origin + "/" || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("CLIENT_APP_URL must be an HTTP or HTTPS origin");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("CLIENT_APP_URL must use HTTPS in production");
  }
  return url.origin;
}

export function linkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const expected = clientOrigin() + "/api/auth/linkedin/callback";
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || expected;
  if (!clientId || !clientSecret || redirectUri !== expected) {
    throw new Error("LinkedIn OIDC credentials and a matching callback URL are required");
  }
  return { clientId, clientSecret, redirectUri };
}
