const assert = require("node:assert/strict");
const { test } = require("node:test");
const { exportJWK, generateKeyPair, SignJWT } = require("jose");
const { LinkedInService } = require("../dist/auth/linkedin.service");

test("validates LinkedIn ID tokens against the configured client and signing keys", async (context) => {
  process.env.LINKEDIN_CLIENT_ID = "test-client";
  process.env.LINKEDIN_CLIENT_SECRET = "test-secret";
  process.env.CLIENT_APP_URL = "http://localhost:4028";
  const issuer = "https://www.linkedin.com";
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const foreign = await generateKeyPair("RS256");
  const key = { ...await exportJWK(publicKey), kid: "test-key", alg: "RS256" };
  const tokens = {
    valid: await signed(privateKey),
    wrongAudience: await signed(privateKey, "unknown-client"),
    foreignSignature: await signed(foreign.privateKey),
    expired: await signed(privateKey, "test-client", "1 hour ago"),
  };

  async function signed(signingKey, audience = "test-client", expiry = "5 minutes") {
    return new SignJWT({ name: "Pilot Colleague" }).setProtectedHeader({ alg: "RS256", kid: key.kid })
      .setIssuer(issuer).setAudience(audience).setSubject("test-subject").setIssuedAt().setExpirationTime(expiry).sign(signingKey);
  }

  context.mock.method(global, "fetch", async (target, options) => {
    const url = new URL(target);
    assert.equal(url.origin, issuer);
    if (url.pathname === "/oauth/openid/jwks") return Response.json({ keys: [key] });
    assert.equal(url.pathname, "/oauth/v2/accessToken");
    assert.equal(options.body.get("grant_type"), "authorization_code");
    assert.equal(options.body.get("redirect_uri"), "http://localhost:4028/api/auth/linkedin/callback");
    return Response.json({ id_token: tokens[options.body.get("code")] });
  });
  const service = new LinkedInService();
  assert.deepEqual(await service.verify("valid"), { issuer, subject: "test-subject", name: "Pilot Colleague" });
  await assert.rejects(service.verify("wrongAudience"), /aud/);
  await assert.rejects(service.verify("foreignSignature"), /signature/);
  await assert.rejects(service.verify("expired"), /exp/);
});
