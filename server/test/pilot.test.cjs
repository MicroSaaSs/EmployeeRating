const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { test } = require("node:test");
const { Test } = require("@nestjs/testing");
const { Pool } = require("pg");
const { AppModule } = require("../dist/app.module");
const { configureApp } = require("../dist/main");
const { AuthService, digest, newToken } = require("../dist/auth/auth.service");
const { LinkedInService } = require("../dist/auth/linkedin.service");
const { migrate } = require("../dist/database/migrate");
const { Database } = require("../dist/database/database");
const { PilotOperationsService } = require("../dist/pilot/operations.service");

test("invited colleagues can exchange private ratings and operators can moderate them", async () => {
  const baseUrl = process.env.DATABASE_URL;
  assert.ok(baseUrl, "Set DATABASE_URL to a PostgreSQL database for integration tests");
  const admin = new Pool({ connectionString: baseUrl });
  const schema = "pilot_test_" + randomBytes(8).toString("hex");
  const origin = "http://localhost:4028";
  const connection = new URL(baseUrl);
  connection.searchParams.set("options", "-c search_path=" + schema);
  process.env.DATABASE_URL = connection.href;
  process.env.CLIENT_APP_URL = origin;
  let app;

  try {
    await admin.query("CREATE SCHEMA " + schema);
    const identities = new Map();
    let providerCalls = 0;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LinkedInService)
      .useValue({
        authorizationUrl: (state) => "https://www.linkedin.com/oauth/v2/authorization?state=" + state,
        verify: async (code) => {
          providerCalls += 1;
          if (!identities.has(code)) throw new Error("Unknown test identity");
          return { issuer: "https://www.linkedin.com", subject: code, name: identities.get(code) };
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    const db = app.get(Database);
    const operations = app.get(PilotOperationsService);
    await migrate(db);
    await migrate(db);
    await app.listen(0, "127.0.0.1");
    const url = await app.getUrl();

    async function api(path, { cookie, method = "GET", body, from = origin } = {}) {
      const response = await fetch(url + "/api" + path, {
        method,
        redirect: "manual",
        body: body && JSON.stringify(body),
        headers: {
          Origin: from,
          ...(cookie && { Cookie: cookie }),
          ...(body && { "Content-Type": "application/json" }),
        },
      });
      const json = response.headers.get("content-type")?.includes("application/json") ? await response.json() : undefined;
      return { status: response.status, headers: response.headers, json };
    }

    function cookieFrom(result, name) {
      const header = result.headers.getSetCookie().find((value) => value.startsWith(name + "="));
      assert.match(header, /HttpOnly/i);
      assert.match(header, /SameSite=Lax/i);
      return header.split(";")[0];
    }

    async function invite(role = "participant") {
      const issued = await operations.issueInvite(role, "test");
      return new URLSearchParams(new URL(issued.url).hash.slice(1)).get("invite");
    }

    async function begin(token) {
      const result = await api("/auth/linkedin/start", { method: "POST", body: token ? { invite: token } : {} });
      assert.equal(result.status, 200, JSON.stringify(result.json));
      return { browser: cookieFrom(result, "oauth_browser"), state: new URL(result.json.url).searchParams.get("state") };
    }

    function complete(code, state, cookie) {
      return api("/auth/linkedin/callback?code=" + code + "&state=" + state, { cookie });
    }

    async function join(code, name, token) {
      identities.set(code, name);
      const { browser, state } = await begin(token);
      const result = await complete(code, state, browser);
      assert.equal(result.headers.get("location"), origin + "/dashboard-home");
      const cookie = cookieFrom(result, "sid");
      const profile = await api("/auth/session", { cookie });
      assert.deepEqual(Object.keys(profile.json), ["user"]);
      assert.deepEqual(Object.keys(profile.json.user).sort(), ["id", "name", "role"]);
      return { cookie, ...profile.json.user };
    }

    assert.equal((await api("/health")).status, 200);
    assert.equal((await api("/auth/session")).status, 204);
    assert.equal((await api("/ratings/mine")).status, 401);
    assert.equal((await api("/auth/linkedin/start", { method: "POST", body: {}, from: "https://other.example" })).status, 403);
    assert.equal((await fetch(url + "/API/auth/linkedin/start", { method: "POST" })).status, 403);

    const firstInvite = await invite();
    const attempt = await begin(firstInvite);
    const wrongBrowser = await begin();
    assert.match((await complete("alice", attempt.state, wrongBrowser.browser)).headers.get("location"), /error=signin/);
    assert.match((await complete("alice", newToken(), attempt.browser)).headers.get("location"), /error=signin/);
    assert.equal(providerCalls, 0, "An invalid attempt must fail before the provider code exchange");

    const alice = await join("alice", "Alice Pilot", firstInvite);
    for (const browser of [attempt.browser, wrongBrowser.browser]) {
      assert.match((await complete("alice", wrongBrowser.state, browser)).headers.get("location"),
        browser === wrongBrowser.browser ? /dashboard-home$/ : /error=signin/);
    }
    assert.match((await complete("alice", wrongBrowser.state, wrongBrowser.browser)).headers.get("location"), /error=signin/);

    identities.set("outside", "Outside Pilot");
    const usedInvite = await begin(firstInvite);
    assert.match((await complete("outside", usedInvite.state, usedInvite.browser)).headers.get("location"), /error=invite/);
    const noInvite = await begin();
    assert.match((await complete("outside", noInvite.state, noInvite.browser)).headers.get("location"), /error=invite/);
    const expired = await begin();
    await db.pool.query("UPDATE oauth_attempts SET expires_at = now() WHERE state_digest = $1", [digest(expired.state)]);
    const callsBeforeExpiry = providerCalls;
    assert.match((await complete("alice", expired.state, expired.browser)).headers.get("location"), /error=signin/);
    assert.equal(providerCalls, callsBeforeExpiry);

    const bob = await join("bob", "Bob Pilot", await invite());
    const other = await join("other", "Another Pilot", await invite());
    const operator = await join("operator", "Pilot Operator", await invite("operator"));
    assert.equal(operator.role, "operator");
    assert.equal((await api("/moderation", alice)).status, 403);
    assert.equal((await api("/pilot/metrics", alice)).status, 403);
    assert.equal((await api("/pilot/invitations", { ...alice, method: "POST" })).status, 403);

    const issued = await api("/pilot/invitations", { ...operator, method: "POST" });
    assert.equal(issued.status, 201);
    const fresh = issued.json;
    const list = await api("/pilot/invitations", operator);
    assert.deepEqual(list.json.find((entry) => entry.id === fresh.id), {
      id: fresh.id, role: "participant", expiresAt: fresh.expiresAt, status: "active",
    });
    const revokePath = "/pilot/invitations/" + fresh.id;
    const pending = await begin(new URLSearchParams(new URL(fresh.url).hash.slice(1)).get("invite"));
    assert.equal((await api(revokePath, { ...alice, method: "DELETE" })).status, 403);
    assert.equal((await api(revokePath, { ...operator, method: "DELETE" })).status, 204);
    assert.equal((await api(revokePath, { ...operator, method: "DELETE" })).status, 409);
    assert.match((await complete("outside", pending.state, pending.browser)).headers.get("location"), /error=invite/);
    assert.equal((await api("/pilot/invitations", operator)).json.find(({ id }) => id === fresh.id).status, "revoked");

    async function work(user, company, start, end) {
      const added = await api("/work-history", { ...user, method: "POST", body: { company, title: "Engineer", start, end } });
      assert.equal(added.status, 204, JSON.stringify(added.json));
      assert.equal((await api("/directory-visibility", { ...user, method: "PUT", body: { visible: true } })).status, 204);
    }

    await work(alice, "  Same  Company  ", "2021-01-01", "2023-01-01");
    await work(bob, "Same Co", "2023-01-01", null);
    const companyAliases = "/pilot/companies/aliases";
    const aliasBody = { canonical: "Same Company", alias: "Same Co" };
    assert.equal((await api("/pilot/companies", alice)).status, 403);
    assert.equal((await api(companyAliases + "/preview", { ...alice, method: "POST", body: aliasBody })).status, 403);
    assert.equal((await api(companyAliases, { ...alice, method: "POST", body: aliasBody })).status, 403);
    const aliasPreview = await api(companyAliases + "/preview", { ...operator, method: "POST", body: aliasBody });
    assert.deepEqual(aliasPreview.json, { ...aliasBody, affectedEntries: 1, alreadyLinked: false });
    assert.equal((await api("/work-history", bob)).json.history[0].company, "Same Co");
    const links = await Promise.all([1, 2].map(() => api(companyAliases, { ...operator, method: "POST", body: aliasBody })));
    assert(links.every(result => result.status === 200));
    assert.deepEqual(links.map(result => result.json.affectedEntries).sort(), [0, 1]);
    assert.equal((await api("/work-history", bob)).json.history[0].company, "Same Company");
    const companies = await api("/pilot/companies?q=same%20co", operator);
    assert.deepEqual(companies.json.companies.map(({ name, aliases }) => ({ name, aliases })), [
      { name: "Same Company", aliases: ["Same Co"] },
    ]);
    const linkedAlias = await api(companyAliases + "/preview", { ...operator, method: "POST", body: aliasBody });
    assert.equal(linkedAlias.json.alreadyLinked, true);
    await work(other, "Same Company", "2012-01-01", "2013-01-01");
    const linkedInPost = (user, body) => api("/work-history", { ...user, method: "POST", body });
    const importedAlias = await linkedInPost(bob, {
      company: "Same Co", title: "Engineer", start: "2023-01-15", end: null,
      linkedinSource: { company: "Same Co", title: "ENGINEER", start: "2023-01", end: null },
    });
    assert.equal(importedAlias.status, 409, "The import must match a precise saved date through a company alias");

    const source = { company: "Import Example", title: "Engineer", start: "2022", end: "2022" };
    const editedPosition = { company: "Import Example", title: "Engineer", start: "2023-02-14", end: "2023-09-01", linkedinSource: source };
    const concurrentImports = await Promise.all([linkedInPost(other, editedPosition), linkedInPost(other, editedPosition)]);
    assert.deepEqual(concurrentImports.map(result => result.status).sort(), [204, 409]);
    assert.equal((await linkedInPost(other, { ...editedPosition, start: "2022-01-01", end: "2022-12-31" })).status, 409,
      "The original LinkedIn dates must still match after edits");
    const distinct = { ...editedPosition, start: "2024-01-01", end: null, linkedinSource: { ...source, start: "2024", end: null } };
    assert.equal((await linkedInPost(other, distinct)).status, 204);
    const importedHistory = (await api("/work-history", other)).json.history.filter(row => row.linkedinSource);
    assert.equal(importedHistory.length, 2);
    assert(importedHistory.some(row => row.start === editedPosition.start && row.linkedinSource.start === "2022"));
    assert.equal((await api(companyAliases, { ...operator, method: "POST", body: { ...aliasBody, canonical: "Import Example" } })).status, 409);
    assert.deepEqual((await api("/professionals/search?q=bob", alice)).json, {
      professionals: [{ id: bob.id, name: "Bob Pilot", eligible: true }],
      hasMore: false, hasWorkHistory: true,
    });
    assert.deepEqual((await api("/professionals/search?eligible=1", operator)).json, {
      professionals: [], hasMore: false, hasWorkHistory: false,
    });
    assert.deepEqual((await api("/professionals/search?q=Another", alice)).json.professionals, [
      { id: other.id, name: "Another Pilot", eligible: false },
    ]);
    assert.equal((await api("/professionals/search?eligible=yes", alice)).status, 400);
    assert.equal((await api("/professionals/search?page=0", alice)).status, 400);
    assert.equal((await api("/directory-visibility", { ...bob, method: "PUT", body: { visible: false } })).status, 204);
    assert.deepEqual((await api("/professionals/search?q=bob&eligible=1", alice)).json.professionals, []);
    assert.equal((await api("/professionals/" + bob.id, alice)).status, 404);
    assert.equal((await api("/directory-visibility", { ...bob, method: "PUT", body: { visible: true } })).status, 204);

    await db.pool.query(
      `INSERT INTO users (issuer, subject, name, role, directory_visible)
       SELECT 'https://example.test', 'directory-page-' || n, 'A Directory Test ' || lpad(n::text, 3, '0'), 'operator', true
       FROM generate_series(1, 51) AS n`,
    );
    const firstPage = (await api("/professionals/search?q=Directory", alice)).json;
    assert.equal(firstPage.professionals.length, 50);
    assert.equal(firstPage.hasMore, true);
    const nextPage = (await api("/professionals/search?q=Directory&page=2", alice)).json;
    assert.equal(nextPage.professionals.length, 1);
    assert.equal(nextPage.professionals[0].name, "A Directory Test 051");
    assert.equal(nextPage.hasMore, false);
    assert.deepEqual((await api("/professionals/search?eligible=1", alice)).json.professionals, [
      { id: bob.id, name: "Bob Pilot", eligible: true },
    ]);
    const profile = await api("/professionals/" + bob.id, alice);
    assert.deepEqual(profile.json, { id: bob.id, name: "Bob Pilot", eligible: true });
    assert.equal((await api("/professionals/" + other.id, alice)).json.eligible, false);
    const aliceWork = (await api("/work-history", alice)).json.history[0];
    assert.equal((await api("/work-history/" + aliceWork.id, { ...bob, method: "DELETE" })).status, 404);

    const body = {
      overall: 5,
      categories: { technical: 5, communication: 4, teamwork: 5 },
      feedback: "They consistently shared helpful feedback while we worked together.",
      anonymous: true,
      authorId: other.id,
    };
    assert.equal((await api("/ratings/for/" + other.id, { ...alice, method: "PUT", body })).status, 403);
    assert.equal((await api("/ratings/for/" + alice.id, { ...alice, method: "PUT", body })).status, 403);
    const successful = await Promise.all([1, 2].map(() => api("/ratings/for/" + bob.id, { ...alice, method: "PUT", body })));
    for (const result of successful) assert.equal(result.status, 200, JSON.stringify(result.json));
    assert.equal(successful[0].json.id, successful[1].json.id);

    const given = (await api("/ratings/mine", alice)).json.given;
    assert.equal(given.length, 1);
    const received = (await api("/ratings/mine", bob)).json.received;
    assert.equal(received.length, 1);
    assert.equal(received[0].opened, false);
    assert.equal(received[0].name, "Anonymous colleague");
    assert.equal(received[0].authorId, undefined);
    assert.equal(received[0].eligibility, undefined);
    assert.deepEqual((await api("/ratings/mine", other)).json, { given: [], received: [] });
    assert.equal((await api("/ratings/for/" + bob.id, other)).json.rating, null);

    const reportPath = "/ratings/" + received[0].id + "/report";
    const openedPath = "/ratings/received/opened";
    const openedBody = { ids: [received[0].id] };
    assert.equal((await api(openedPath, { ...other, method: "POST", body: openedBody })).status, 204);
    assert.equal((await api("/pilot/metrics", operator)).json.ratingsOpened, 0);
    assert.equal((await api(openedPath, { ...bob, method: "POST", body: openedBody })).status, 204);
    assert.equal((await api(openedPath, { ...bob, method: "POST", body: openedBody })).status, 204);
    assert.equal((await api("/ratings/mine", bob)).json.received[0].opened, true);
    assert.equal((await api("/ratings/mine", alice)).json.given[0].opened, undefined);
    assert.equal((await api(reportPath, { ...other, method: "POST", body: { reason: "Private rating" } })).status, 404);
    assert.equal((await api(reportPath, { ...bob, method: "POST", body: { reason: "Review the submitted feedback" } })).status, 204);
    assert.equal((await api("/ratings/for/" + bob.id, { ...alice, method: "PUT", body })).status, 409);
    const ownReports = "/ratings/reports/mine";
    const [filed] = (await api(ownReports, bob)).json;
    assert.equal(filed.outcome, "open");
    assert.equal(filed.decidedAt, null);
    assert.deepEqual((await api(ownReports, alice)).json, []);
    assert.deepEqual((await api(ownReports, other)).json, []);
    const queue = (await api("/moderation?status=open&page=1", operator)).json;
    assert.equal(queue.reports[0].author, "Alice Pilot");
    assert.equal(queue.reports[0].eligibility.start, "2023-01-01");
    assert.equal(queue.reports[0].id, filed.id);
    const decision = "/moderation/" + queue.reports[0].id;
    assert.equal((await api(decision + "/history", bob)).status, 403);
    const decisions = await Promise.all([1, 2].map(() =>
      api(decision, { ...operator, method: "POST", body: { action: "hide", note: "Reviewed" } })));
    assert.deepEqual(decisions.map(({ status }) => status).sort(), [204, 409]);
    assert.deepEqual((await api("/ratings/mine", bob)).json.received, []);
    const [hiddenReport] = (await api(ownReports, bob)).json;
    assert.equal(hiddenReport.outcome, "hidden");
    assert.ok(hiddenReport.decidedAt);
    assert.deepEqual(Object.keys(hiddenReport).sort(), ["createdAt", "decidedAt", "id", "outcome", "reason"]);
    assert.deepEqual((await api("/moderation?status=open&page=1", operator)).json.reports, []);
    assert.equal((await api(decision, { ...operator, method: "POST", body: { action: "reinstate", note: "Reviewed again" } })).status, 204);
    assert.equal((await api(ownReports, bob)).json[0].outcome, "restored");
    assert.equal((await api("/ratings/mine", bob)).json.received.length, 1);
    assert.equal((await db.pool.query("SELECT count(*) FROM moderation_actions")).rows[0].count, "2");
    const history = (await api(decision + "/history", operator)).json;
    assert.deepEqual(history.map(({ action, note }) => [action, note]), [
      ["reinstate", "Reviewed again"], ["hide", "Reviewed"],
    ]);
    const activity = (await api("/pilot/metrics", operator)).json;
    assert.equal(activity.signInsStarted, 10);
    assert.equal(activity.signInsCompleted, 5);
    assert.equal(activity.invitesIssued, 5);
    assert.equal(activity.invitesRedeemed, 4);
    assert.equal(activity.accounts, 3);
    assert.equal(activity.accountsWithHistory, 3);
    assert.equal(activity.accountsWithEligibleColleague, 2);
    assert.equal(activity.ratingsOpened, 1);
    assert.equal(activity.distinctRatedPairs, 1);
    assert.equal(activity.reports, 1);
    assert.equal(activity.openReports, 0);
    assert.ok(typeof activity.averageReportResponseSeconds === "number" && activity.averageReportResponseSeconds >= 0);
    assert.equal(JSON.stringify(activity).includes(body.feedback), false);

    const revisedFeedback = "This revised feedback describes a different example from our work together.";
    assert.equal((await api("/ratings/for/" + bob.id, {
      ...alice, method: "PUT", body: { ...body, feedback: revisedFeedback },
    })).status, 200);
    const repeatReports = await Promise.all([1, 2].map(() =>
      api(reportPath, { ...bob, method: "POST", body: { reason: "Please review the revised feedback" } })));
    assert.deepEqual(repeatReports.map(({ status }) => status).sort(), [204, 409]);
    const updatedOpen = (await api("/moderation?status=open", operator)).json.reports;
    const resolved = (await api("/moderation?status=resolved&page=1", operator)).json.reports;
    assert.equal(updatedOpen[0].feedback, revisedFeedback);
    assert.equal(resolved[0].feedback, body.feedback);
    assert.notEqual(updatedOpen[0].id, resolved[0].id);
    assert.deepEqual((await api(ownReports, bob)).json.map(({ outcome }) => outcome), ["open", "restored"]);
    assert.equal((await api("/ratings/mine", bob)).json.received.length, 1);
    assert.equal((await api(decision, { ...operator, method: "POST", body: { action: "reinstate", note: "Old case" } })).status, 409);

    const access = "/pilot/accounts/" + bob.id + "/access";
    const accessHistory = "/pilot/accounts/" + bob.id + "/history";
    const suspend = { suspended: true, note: "Pause access for a pilot review." };
    assert.equal((await api("/pilot/accounts", alice)).status, 403);
    assert.equal((await api(access, { ...alice, method: "PUT", body: suspend })).status, 403);
    assert.equal((await api(accessHistory, bob)).status, 403);
    assert.equal((await api("/pilot/accounts/" + operator.id + "/access", { ...operator, method: "PUT", body: suspend })).status, 404);
    assert.deepEqual((await api("/pilot/accounts?q=" + bob.id.toUpperCase(), operator)).json.accounts, [
      { id: bob.id, name: "Bob Pilot", suspendedAt: null },
    ]);

    const suspensions = await Promise.all([1, 2].map(() => api(access, { ...operator, method: "PUT", body: suspend })));
    assert.deepEqual(suspensions.map(({ status }) => status).sort(), [204, 409]);
    assert.equal((await api("/auth/session", bob)).status, 204);
    assert.equal((await api("/ratings/mine", bob)).status, 401);
    assert.equal((await api("/professionals/" + bob.id, alice)).status, 404);
    assert.deepEqual((await api("/professionals/search?q=bob&eligible=1", alice)).json.professionals, []);
    assert.equal((await api("/ratings/for/" + bob.id, { ...alice, method: "PUT", body })).status, 404);
    assert.equal((await api("/ratings/mine", alice)).json.given[0].canOpenProfile, false);
    assert.equal((await api("/moderation?status=open", operator)).json.reports[0].recipient, "Bob Pilot");
    assert.equal((await api("/pilot/metrics", operator)).json.accounts, 2);
    assert.ok((await api("/pilot/accounts?suspended=1", operator)).json.accounts[0].suspendedAt);

    const blocked = await begin();
    const blockedResult = await complete("bob", blocked.state, blocked.browser);
    assert.match(blockedResult.headers.get("location"), /error=suspended/);
    assert.equal(blockedResult.headers.getSetCookie().some((value) => value.startsWith("sid=")), false);
    assert.equal((await api(access, {
      ...operator, method: "PUT", body: { suspended: false, note: "Pilot review complete." },
    })).status, 204);
    assert.equal((await api("/auth/session", bob)).status, 204, "Restoration must not reactivate revoked sessions");
    const restoredBob = await join("bob", "Bob Pilot");
    assert.equal(restoredBob.id, bob.id);
    assert.equal((await api("/ratings/mine", restoredBob)).json.received.length, 1);
    assert.equal((await api("/professionals/" + bob.id, alice)).json.eligible, true);
    assert.deepEqual((await api(accessHistory, operator)).json.map(({ action, note }) => [action, note]), [
      ["restore", "Pilot review complete."], ["suspend", suspend.note],
    ]);

    assert.equal((await api("/moderation/submissions", { ...operator, method: "PUT", body: { paused: true } })).status, 204);
    assert.equal((await api("/ratings/for/" + bob.id, { ...alice, method: "PUT", body })).status, 409);
    assert.equal((await api("/ratings/mine", restoredBob)).json.received.length, 1);

    const auth = new AuthService(db, app.get(LinkedInService));
    assert.equal((await auth.sessionUser({ cookies: { sid: alice.cookie.split("=")[1] } })).id, alice.id);
    await db.pool.query("UPDATE sessions SET expires_at = now() WHERE user_id = $1", [alice.id]);
    assert.equal((await api("/auth/session", alice)).status, 204);
    assert.equal((await api("/auth/logout", { ...restoredBob, method: "POST" })).status, 204);
    assert.equal((await api("/auth/session", restoredBob)).status, 204);
  } finally {
    await app?.close();
    await admin.query("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
    await admin.end();
    process.env.DATABASE_URL = baseUrl;
  }
});
