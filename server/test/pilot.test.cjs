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

test("LinkedIn sign-up, invitation linking, private ratings and moderation", async () => {
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
    await db.limit("test-retry-time", 1, "Test launch allowance reached");
    await assert.rejects(db.limit("test-retry-time", 1, "Test launch allowance reached"), failure => {
      assert.equal(failure.getStatus(), 429);
      assert.equal(failure.getResponse().message, "Test launch allowance reached");
      const reset = Date.parse(failure.getResponse().retryAt);
      assert.ok(reset > Date.now() && reset <= Date.now() + 3600000);
      return true;
    });
    assert.equal((await api("/dashboard")).status, 401);
    assert.equal((await api("/work-history/import-linkedin", { method: "POST", body: { url: "https://www.linkedin.com/in/example/" } })).status, 404);
    assert.equal((await api("/work-history/linkedin-browser", { method: "POST", body: { url: "https://www.linkedin.com/in/example/" } })).status, 404);
    assert.equal((await api("/work-history/linkedin-browser/00000000-0000-4000-8000-000000000000")).status, 404);
    assert.equal((await api("/linkedin-profile", { method: "PUT", body: { url: "https://www.linkedin.com/in/example/" } })).status, 401);
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
    assert.equal((await api("/work-history/import-linkedin", { cookie: alice.cookie, method: "POST", body: { url: "http://127.0.0.1/" } })).status, 404);
    assert.equal((await api("/work-history/linkedin-browser", { cookie: alice.cookie, method: "POST", body: { url: "http://127.0.0.1/" } })).status, 404);
    assert.equal((await api("/work-history/linkedin-browser/00000000-0000-4000-8000-000000000000", alice)).status, 404);
    assert.equal((await api("/work-history/import-linkedin", { cookie: alice.cookie, method: "POST", body: { url: "https://www.linkedin.com/in/example/" }, from: "https://other.example" })).status, 403);
    assert.deepEqual((await api("/dashboard", alice)).json, {
      workHistoryCount: 0, eligibleColleagueCount: 0, unopenedRatingCount: 0,
    });
    for (const browser of [attempt.browser, wrongBrowser.browser]) {
      assert.match((await complete("alice", wrongBrowser.state, browser)).headers.get("location"),
        browser === wrongBrowser.browser ? /dashboard-home$/ : /error=signin/);
    }
    assert.match((await complete("alice", wrongBrowser.state, wrongBrowser.browser)).headers.get("location"), /error=signin/);

    identities.set("outside", "Outside Pilot");
    const usedInvite = await begin(firstInvite);
    assert.match((await complete("outside", usedInvite.state, usedInvite.browser)).headers.get("location"), /error=invite/);
    const directMember = await join("outside", "Direct Member");
    assert.equal(directMember.role, "participant");
    assert.equal((await api("/pilot/metrics", directMember)).status, 403);
    assert.equal((await api("/dashboard", directMember)).json.eligibleColleagueCount, 0);
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
    assert.equal((await api("/dashboard", alice)).json.eligibleColleagueCount, 0);
    const links = await Promise.all([1, 2].map(() => api(companyAliases, { ...operator, method: "POST", body: aliasBody })));
    assert(links.every(result => result.status === 200));
    assert.deepEqual(links.map(result => result.json.affectedEntries).sort(), [0, 1]);
    assert.equal((await api("/work-history", bob)).json.history[0].company, "Same Company");
    assert.equal((await api("/work-history", {
      ...bob, method: "POST", body: { company: "Same Co", title: "Engineering lead", start: "2023-01-01", end: null },
    })).status, 204);
    assert.deepEqual((await api("/dashboard", alice)).json, {
      workHistoryCount: 1, eligibleColleagueCount: 1, unopenedRatingCount: 0,
    });
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
    const importPath = "/work-history/import";
    const bulkRole = { company: "Bulk Example", title: "Engineer", start: "2020-01-01", end: "2021-12-31" };
    const bulkBody = { entries: [bulkRole, { ...bulkRole, start: "invalid" }] };
    assert.equal((await api(importPath, { method: "POST", body: bulkBody })).status, 401);
    assert.equal((await api(importPath, { ...other, method: "POST", body: bulkBody })).status, 400);
    assert.equal((await api("/work-history", other)).json.history.some(row => row.company === bulkRole.company), false);
    const validBulk = { entries: [bulkRole, editedPosition, bulkRole, { ...bulkRole, title: "Analyst" }] };
    const bulkResults = await Promise.all([1, 2].map(() => api(importPath, { ...other, method: "POST", body: validBulk })));
    assert.deepEqual(bulkResults.map(result => result.status), [200, 200]);
    assert.deepEqual(bulkResults.map(result => result.json).sort((a, b) => a.saved - b.saved), [{ saved: 0, skipped: 4 }, { saved: 2, skipped: 2 }]);
    const savedBulk = (await api("/work-history", other)).json.history.filter(row => row.company === bulkRole.company);
    assert.deepEqual(savedBulk.map(row => row.title).sort(), ["Analyst", "Engineer"]);
    assert.equal((await api(companyAliases, { ...operator, method: "POST", body: { ...aliasBody, canonical: "Import Example" } })).status, 409);
    assert.deepEqual((await api("/professionals/search?q=bob", alice)).json, {
      professionals: [{ id: bob.id, name: "Bob Pilot", eligible: true }],
      hasMore: false, hasWorkHistory: true,
    });
    assert.deepEqual((await api("/professionals/search?eligible=1", operator)).json, {
      professionals: [], hasMore: false, hasWorkHistory: false,
    });
    assert.deepEqual((await api("/professionals/search?q=Another", alice)).json.professionals, []);
    const profileLink = "https://www.linkedin.com/in/example-colleague/";
    const saveProfileLink = (user, value) => api("/linkedin-profile", { ...user, method: "PUT", body: { url: value } });
    const searchLink = (link, user = alice, filters = "") => api("/professionals/search?q=" + encodeURIComponent(link) + filters, user);
    assert.equal((await saveProfileLink(bob, "http://uk.linkedin.com/in/Example-Colleague/?trk=test#about")).status, 204);
    assert.equal((await api("/work-history", bob)).json.linkedinProfileUrl, profileLink);
    assert.equal((await api("/work-history", alice)).json.linkedinProfileUrl, null);
    assert.deepEqual((await searchLink("linkedin.com/in/Example-Colleague")).json.professionals, [
      { id: bob.id, name: "Bob Pilot", eligible: true },
    ]);
    assert.deepEqual((await searchLink(profileLink, bob)).json.professionals, []);
    assert.equal((await saveProfileLink(other, profileLink)).status, 204);
    assert.deepEqual((await searchLink(profileLink)).json.professionals, [{ id: bob.id, name: "Bob Pilot", eligible: true }],
      "A profile link must not reveal a member without shared work dates");
    assert.deepEqual((await searchLink(profileLink, alice, "&eligible=1")).json.professionals, [
      { id: bob.id, name: "Bob Pilot", eligible: true },
    ]);
    assert.equal((await saveProfileLink(other, null)).status, 204);
    assert.equal((await searchLink(profileLink)).json.professionals.length, 1);
    for (const invalid of [
      "https://linkedin.com.evil.example/in/test/", "https://www.linkedin.com/company/test/",
      "https://user:password@www.linkedin.com/in/test/", "https://www.linkedin.com/in/test/extra/",
      "javascript:alert(1)", "https://www.linkedin.com/in/test%2Fextra/",
    ]) {
      assert.equal((await saveProfileLink(bob, invalid)).status, 400);
    }
    assert.equal((await searchLink("https://www.linkedin.com/company/test/")).status, 400);
    assert.equal((await api("/work-history", bob)).json.linkedinProfileUrl, profileLink);
    assert.equal((await api("/professionals/search?eligible=yes", alice)).status, 400);
    assert.equal((await api("/professionals/search?page=0", alice)).status, 400);
    assert.equal((await api("/directory-visibility", { ...bob, method: "PUT", body: { visible: false } })).status, 404);
    assert.equal((await api("/dashboard", alice)).json.eligibleColleagueCount, 1);
    assert.equal((await api("/dashboard", bob)).json.eligibleColleagueCount, 1);
    assert.deepEqual((await api("/professionals/search?q=Alice", bob)).json.professionals, [
      { id: alice.id, name: "Alice Pilot", eligible: true },
    ]);

    await db.pool.query(
      `WITH accounts AS (
         INSERT INTO users (issuer, subject, name, role)
         SELECT 'https://example.test', 'colleague-page-' || n, 'Colleague Page Test ' || lpad(n::text, 3, '0'), 'operator'
         FROM generate_series(1, 51) AS n RETURNING id
       )
       INSERT INTO work_history (user_id, company_id, title, start_date, end_date)
       SELECT accounts.id, companies.id, 'Engineer', '2022-01-01', '2022-12-31'
       FROM accounts CROSS JOIN companies WHERE companies.name_key = 'same company'`,
    );
    const firstPage = (await api("/professionals/search?q=Colleague%20Page", alice)).json;
    assert.equal(firstPage.professionals.length, 50);
    assert.equal(firstPage.hasMore, true);
    const nextPage = (await api("/professionals/search?q=Colleague%20Page&page=2", alice)).json;
    assert.equal(nextPage.professionals.length, 1);
    assert.equal(nextPage.professionals[0].name, "Colleague Page Test 051");
    assert.equal(nextPage.hasMore, false);
    await db.pool.query("DELETE FROM users WHERE issuer='https://example.test' AND subject LIKE 'colleague-page-%'");
    assert.deepEqual((await api("/professionals/search?eligible=1", alice)).json.professionals, [
      { id: bob.id, name: "Bob Pilot", eligible: true },
    ]);
    const profile = await api("/professionals/" + bob.id, alice);
    assert.deepEqual(profile.json, { id: bob.id, name: "Bob Pilot", eligible: true });
    assert.equal((await api("/professionals/" + other.id, alice)).status, 404);
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
    assert.equal((await api("/dashboard", bob)).json.unopenedRatingCount, 1);
    assert.equal((await api("/dashboard", alice)).json.unopenedRatingCount, 0);
    assert.equal(received[0].name, "Anonymous colleague");
    assert.equal(received[0].authorId, undefined);
    assert.equal(received[0].eligibility, undefined);
    assert.equal((await api("/ratings/for/" + bob.id, { ...alice, method: "PUT", body: { ...body, anonymous: false } })).status, 200);
    const [named] = (await api("/ratings/mine", bob)).json.received;
    assert.equal(named.id, received[0].id);
    assert.equal(named.name, "Alice Pilot");
    assert.equal((await api("/ratings/for/" + bob.id, { ...alice, method: "PUT", body })).status, 200);
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
    assert.equal((await api("/dashboard", bob)).json.unopenedRatingCount, 0);
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
    assert.equal(activity.signInsCompleted, 6);
    assert.equal(activity.invitesIssued, 5);
    assert.equal(activity.invitesRedeemed, 4);
    assert.equal(activity.accounts, 4);
    assert.equal(activity.accountsWithHistory, 3);
    assert.equal(activity.accountsWithEligibleColleague, 2);
    assert.equal(activity.ratingsOpened, 1);
    assert.equal(activity.distinctRatedPairs, 1);
    assert.equal(activity.reports, 1);
    assert.equal(activity.openReports, 0);
    assert.ok(typeof activity.averageReportResponseSeconds === "number" && activity.averageReportResponseSeconds >= 0);
    assert.equal(JSON.stringify(activity).includes(body.feedback), false);

    const draftBody = {
      name: "Draft Colleague",
      linkedinProfileUrl: "https://www.linkedin.com/in/draft-colleague/",
      history: [{ company: "Same Company", title: "Developer", start: "2021-01-01", end: "2022-12-31" }],
    };
    const draftPath = "/colleague-drafts";
    assert.equal((await api(draftPath)).status, 401);
    assert.equal((await api(draftPath + "/overlap", { method: "POST", body: draftBody })).status, 401);
    assert.deepEqual((await api(draftPath + "/overlap", { ...alice, method: "POST", body: {
      ...draftBody, history: [...draftBody.history, { ...draftBody.history[0], company: "Same Co" }],
    } })).json, { matches: [{ company: "Same Company", start: "2021-01-01", end: "2022-12-31" }] });
    assert.deepEqual((await api(draftPath + "/overlap", { ...other, method: "POST", body: draftBody })).json, { matches: [] });
    assert.equal((await api(draftPath + "/overlap", { ...alice, method: "POST", body: {
      ...draftBody, history: [{ ...draftBody.history[0], start: "invalid" }],
    } })).status, 400);
    const draftCreated = await api(draftPath, { ...alice, method: "POST", body: draftBody });
    assert.equal(draftCreated.status, 201);
    const draftId = draftCreated.json.id;
    assert.equal((await api(draftPath, { ...alice, method: "POST", body: draftBody })).json.id, draftId);
    const correctedDraft = { ...draftBody, name: "Corrected Colleague", history: [
      { ...draftBody.history[0], start: "2019-01-01", end: "2020-12-31" },
      { ...draftBody.history[0], company: "Same Co", title: "Senior Developer", start: "2021-02-17", end: null },
    ] };
    assert.equal((await api(draftPath, { ...alice, method: "POST", body: correctedDraft })).json.id, draftId);
    const correctedSaved = (await api(draftPath, alice)).json;
    assert.equal(correctedSaved.length, 1);
    assert.equal(correctedSaved[0].name, correctedDraft.name);
    assert.deepEqual(correctedSaved[0].history, correctedDraft.history);
    assert.deepEqual(correctedSaved[0].overlappingRoleIndexes, [1]);
    assert.equal((await api(draftPath, { ...alice, method: "POST", body: draftBody })).json.id, draftId);
    assert.equal((await api(draftPath, alice)).json.length, 1);
    assert.deepEqual((await api(draftPath, other)).json, []);
    assert.deepEqual((await api(draftPath, operator)).json, []);
    assert.equal((await api(draftPath + "/" + draftId, { ...other, method: "DELETE" })).status, 404);
    assert.equal((await api(draftPath + "/" + draftId + "/invitation", { ...other, method: "POST" })).status, 404);
    assert.equal((await api("/professionals/search?q=" + encodeURIComponent(draftBody.linkedinProfileUrl), alice)).json.professionals.length, 0);
    assert.equal((await api("/work-history", alice)).json.history.length, 1);
    assert.equal((await api(draftPath, { ...alice, method: "POST", body: { ...draftBody, history: [] } })).status, 400);
    const requestsPath = "/pilot/colleague-invitations";
    assert.equal((await api(requestsPath, alice)).status, 403);
    const requestResults = await Promise.all([1, 2].map(() =>
      api(draftPath + "/" + draftId + "/invitation", { ...alice, method: "POST" })));
    assert.deepEqual(requestResults.map(result => result.status).sort(), [204, 409]);
    assert.equal((await api(draftPath, { ...alice, method: "POST", body: draftBody })).status, 409);
    const [draftRequest] = (await api(requestsPath, operator)).json.requests;
    assert.equal(draftRequest.id, draftId);
    assert.equal(draftRequest.history, undefined);
    assert.equal((await api(requestsPath + "/" + draftId, { ...alice, method: "POST" })).status, 403);
    const issuedRequests = await Promise.all([1, 2].map(() =>
      api(requestsPath + "/" + draftId, { ...operator, method: "POST" })));
    assert.deepEqual(issuedRequests.map(result => result.status).sort(), [201, 409]);
    const issuedRequest = issuedRequests.find(result => result.status === 201).json;
    assert.equal((await api(draftPath, alice)).json[0].invitationStatus, "issued");
    assert.equal((await api(draftPath + "/" + draftId + "/invitation", { ...alice, method: "POST" })).status, 409);
    assert.equal((await api(requestsPath, operator)).json.requests.length, 0);
    assert.equal((await api("/pilot/invitations/" + issuedRequest.id, { ...operator, method: "DELETE" })).status, 204);
    assert.equal((await api(draftPath, alice)).json[0].invitationStatus, "revoked");
    assert.equal((await api(draftPath + "/" + draftId + "/invitation", { ...alice, method: "POST" })).status, 204);
    const replacement = await api(requestsPath + "/" + draftId, { ...operator, method: "POST" });
    assert.equal(replacement.status, 201);
    const joinedDraftColleague = await join("invited-draft-colleague", "Draft Colleague");
    const invitationAttempt = await begin(new URLSearchParams(new URL(replacement.json.url).hash.slice(1)).get("invite"));
    const accepted = await complete("invited-draft-colleague", invitationAttempt.state, invitationAttempt.browser + "; " + joinedDraftColleague.cookie);
    assert.equal(accepted.headers.get("location"), origin + "/dashboard-home");
    const acceptedCookie = cookieFrom(accepted, "sid");
    assert.equal((await api("/auth/session", { cookie: acceptedCookie })).json.user.id, joinedDraftColleague.id);
    assert.equal((await api("/auth/session", joinedDraftColleague)).status, 204);
    const { rows: [redeemed] } = await db.pool.query("SELECT redeemed_by FROM invites WHERE id=$1", [replacement.json.id]);
    assert.equal(redeemed.redeemed_by, joinedDraftColleague.id);
    assert.equal((await api("/pilot/metrics", operator)).json.invitesRedeemed, activity.invitesRedeemed + 1);
    assert.equal((await api(draftPath, alice)).json[0].invitationStatus, "redeemed");
    assert.equal((await api(draftPath + "/" + draftId, { ...alice, method: "DELETE" })).status, 204);
    assert.deepEqual((await api(draftPath, alice)).json, []);
    await db.pool.query("DELETE FROM users WHERE id=$1", [joinedDraftColleague.id]);

    const pendingDraft = (await api(draftPath, { ...alice, method: "POST", body: draftBody })).json.id;
    const pendingPath = draftPath + "/" + pendingDraft;
    assert.equal((await api(pendingPath + "/invitation", { ...alice, method: "POST" })).status, 204);
    const directLinkPath = pendingPath + "/invitation-link";
    assert.equal((await api(directLinkPath, { ...other, method: "POST" })).status, 404);
    const directLinks = await Promise.all([1, 2].map(() => api(directLinkPath, { ...alice, method: "POST" })));
    assert.deepEqual(directLinks.map(({ status }) => status).sort(), [201, 409]);
    const firstLink = directLinks.find(({ status }) => status === 201).json;
    assert.match(firstLink.url, /^http:\/\/localhost:4028\/#invite=[\w-]{43}$/);
    assert.equal((await api(requestsPath, operator)).json.requests.length, 0);
    assert.equal((await searchLink(draftBody.linkedinProfileUrl, other)).json.professionals.length, 0);
    const directDraft = (await api(draftPath, alice)).json[0];
    assert.equal(directDraft.invitationStatus, "issued");
    assert.equal(directDraft.canEdit, true);
    assert.equal(directDraft.url, undefined);
    assert.equal((await api(pendingPath + "/invitation", { ...alice, method: "POST" })).status, 409);
    const replaceLink = await api(directLinkPath, {
      ...alice, method: "POST", body: { replaceId: directDraft.invitationId },
    });
    assert.equal(replaceLink.status, 201);
    assert.notEqual(firstLink.url, replaceLink.json.url);
    assert.equal((await api(directLinkPath, {
      ...alice, method: "POST", body: { replaceId: directDraft.invitationId },
    })).status, 409);
    const firstLinkToken = new URLSearchParams(new URL(firstLink.url).hash.slice(1)).get("invite");
    const { rows: [oldLink] } = await db.pool.query("SELECT revoked_at FROM invites WHERE digest=$1", [digest(firstLinkToken)]);
    assert.ok(oldLink.revoked_at);
    const newLinkToken = new URLSearchParams(new URL(replaceLink.json.url).hash.slice(1)).get("invite");
    const issuedAttempt = await begin(newLinkToken);
    assert.equal((await complete("other", issuedAttempt.state, issuedAttempt.browser)).headers.get("location"), origin + "/dashboard-home");
    assert.equal((await api(draftPath, alice)).json[0].invitationStatus, "redeemed");
    assert.equal((await api(directLinkPath, { ...alice, method: "POST" })).status, 409);
    assert.equal((await api(pendingPath, { ...alice, method: "DELETE" })).status, 204);

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
    assert.equal((await api("/dashboard", bob)).status, 401);
    assert.deepEqual((await searchLink(profileLink)).json.professionals, []);
    assert.equal((await saveProfileLink(bob, null)).status, 401);
    assert.equal((await api("/dashboard", alice)).json.eligibleColleagueCount, 0);
    assert.equal((await api("/professionals/" + bob.id, alice)).status, 404);
    assert.deepEqual((await api("/professionals/search?q=bob&eligible=1", alice)).json.professionals, []);
    assert.equal((await api("/ratings/for/" + bob.id, { ...alice, method: "PUT", body })).status, 404);
    assert.equal((await api("/ratings/mine", alice)).json.given[0].canOpenProfile, false);
    assert.equal((await api("/moderation?status=open", operator)).json.reports[0].recipient, "Bob Pilot");
    assert.equal((await api("/pilot/metrics", operator)).json.accounts, 3);
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

    // Shared colleague profiles are independent of the earlier private drafts.
    assert.equal((await api("/moderation/submissions", { ...operator, method: "PUT", body: { paused: false } })).status, 204);
    const sharedProfiles = "/colleague-profiles";
    const sharedUrl = "https://www.linkedin.com/in/shared-colleague/";
    const newColleague = { name: "Shared Colleague", linkedinProfileUrl: sharedUrl, history: [] };
    assert.equal((await api(sharedProfiles, { method: "POST", body: newColleague })).status, 401);
    assert.equal((await api(sharedProfiles, { ...alice, method: "POST", body: {
      ...newColleague, linkedinProfileUrl: profileLink,
    } })).status, 409, "A member's existing profile link prevents a duplicate draft");
    const drafts = await Promise.all([alice, other].map((member) =>
      api(sharedProfiles, { ...member, method: "POST", body: newColleague })));
    assert(drafts.every(({ status }) => status === 201));
    const sharedId = drafts[0].json.id;
    assert(drafts.every(({ json }) => json.id === sharedId));
    assert.equal(drafts.filter(({ json }) => json.created).length, 1);
    const shared = sharedProfiles + "/" + sharedId;
    const sharedProfessional = "/professionals/" + sharedId;
    assert.deepEqual((await api("/professionals/search?q=Shared%20Colleague", other)).json.professionals, [
      { id: sharedId, name: newColleague.name, eligible: false, draft: true },
    ]);
    assert.deepEqual((await searchLink("linkedin.com/in/Shared-Colleague", other)).json.professionals, [
      { id: sharedId, name: newColleague.name, eligible: false, draft: true },
    ]);
    assert.equal((await api(shared, other)).json.history.length, 0);
    assert.equal((await saveProfileLink(other, sharedUrl)).status, 409, "A self-reported link must not claim a shared draft");

    const sharedRole = { company: "Same Co", title: "Engineer", start: "2021-01-01", end: null };
    const editedColleague = { ...newColleague, history: [sharedRole], revision: 1 };
    assert.equal((await api(shared, { ...other, method: "PUT", body: editedColleague })).status, 204);
    assert.equal((await api(shared, { ...alice, method: "PUT", body: editedColleague })).status, 409);
    assert.equal((await api(sharedProfessional, alice)).json.eligible, true);
    assert.equal((await api(sharedProfessional, other)).json.eligible, false);
    const draftRatingPath = "/ratings/for/" + sharedId;
    assert.equal((await api(draftRatingPath, { ...other, method: "PUT", body })).status, 403);
    const privateDraftRating = await api(draftRatingPath, { ...alice, method: "PUT", body: { ...body, anonymous: true } });
    assert.equal(privateDraftRating.status, 200, JSON.stringify(privateDraftRating.json));
    const namedDraftRating = await api(draftRatingPath, { ...restoredBob, method: "PUT", body: { ...body, anonymous: false } });
    assert.equal(namedDraftRating.status, 200, JSON.stringify(namedDraftRating.json));
    assert.equal((await api(draftRatingPath, other)).json.rating, null);

    const issuedByAlice = await api(shared + "/invitations", { ...alice, method: "POST" });
    const issuedByBob = await api(shared + "/invitations", { ...restoredBob, method: "POST" });
    const spareInvitation = await api(shared + "/invitations", { ...other, method: "POST" });
    assert([issuedByAlice, issuedByBob, spareInvitation].every(({ status }) => status === 201));
    assert.notEqual(issuedByAlice.json.url, issuedByBob.json.url);
    const tokenOf = result => new URLSearchParams(new URL(result.json.url).hash.slice(1)).get("invite");
    const claimant = await join("shared-colleague", newColleague.name);
    await work(claimant, sharedRole.company, sharedRole.start, sharedRole.end);
    const signIn = await begin(tokenOf(issuedByBob));
    const invitedOwner = await complete("shared-colleague", signIn.state, signIn.browser + "; " + claimant.cookie);
    assert.equal(invitedOwner.headers.get("location"), origin + sharedProfessional + "?claim=1");
    const owner = { ...claimant, cookie: cookieFrom(invitedOwner, "sid") };
    assert.equal((await api("/auth/session", owner)).json.user.id, claimant.id);
    assert.equal((await api(shared, owner)).json.invitedBy, restoredBob.name);
    assert.equal((await api("/ratings/mine", owner)).json.received.length, 0);
    const wrongRecipient = await begin(tokenOf(issuedByAlice));
    const forwardedInvite = await complete("other", wrongRecipient.state, wrongRecipient.browser);
    assert.equal(forwardedInvite.headers.get("location"), origin + sharedProfessional + "?claim=1");
    assert.equal((await api("/ratings/mine", { cookie: cookieFrom(forwardedInvite, "sid") })).json.received.length, 0);

    const claimPath = shared + "/claim";
    const claimQueue = "/pilot/colleague-claims";
    const challenge = await api(claimPath, { ...owner, method: "POST" });
    assert.match(challenge.json.code, /^EPR-[\w-]{16}$/);
    assert.equal((await api(shared, other)).json.claim, null);
    assert.equal((await api(claimQueue, owner)).status, 403);
    assert.equal((await api(claimPath, { ...owner, method: "PUT", body: { revision: 2 } })).status, 204);
    const [pendingClaim] = (await api(claimQueue, operator)).json.claims;
    assert.equal(pendingClaim.code, undefined, "The administrator has to obtain the code from the LinkedIn profile");
    const reviewClaim = code => api(claimQueue + "/" + pendingClaim.id, { ...operator, method: "PUT", body: { code } });
    assert.equal((await reviewClaim("EPR-0000000000000000")).status, 400);
    const updatedColleague = { ...editedColleague, revision: 2, history: [
      sharedRole, { ...sharedRole, company: "Earlier Employer", start: "2018-01-01", end: "2019-12-31" },
    ] };
    assert.equal((await api(shared, { ...other, method: "PUT", body: updatedColleague })).status, 204);
    const updatedDraft = (await api(shared, alice)).json;
    assert.deepEqual(updatedDraft.overlappingRoleIds, [updatedDraft.history.find(role => role.company === "Same Company").id]);
    assert.deepEqual((await api(shared, other)).json.overlappingRoleIds, []);
    assert.equal((await reviewClaim(challenge.json.code)).status, 409, "An edit requires the claimant to review again");
    assert.equal((await api(claimPath, { ...owner, method: "PUT", body: { revision: 2 } })).status, 409);
    assert.equal((await api(claimPath, { ...owner, method: "PUT", body: { revision: 3 } })).status, 204);
    assert.equal((await reviewClaim(challenge.json.code)).status, 204);
    assert.equal((await api(shared, alice)).status, 404);
    assert.equal((await api(shared, { ...other, method: "PUT", body: { ...updatedColleague, revision: 3 } })).status, 404);
    assert.equal((await api(shared + "/invitations", { ...alice, method: "POST" })).status, 404);
    assert.equal((await api(draftRatingPath, { ...alice, method: "PUT", body })).status, 404);
    const revokedInvite = await begin(tokenOf(spareInvitation));
    assert.match((await complete("other", revokedInvite.state, revokedInvite.browser)).headers.get("location"), /error=invite/);
    assert.equal((await api(sharedProfessional, alice)).json.id, owner.id);
    assert.equal((await api(sharedProfessional, owner)).json.claimedByViewer, true);
    assert.equal((await api(sharedProfessional, other)).status, 404);
    assert.deepEqual((await searchLink(sharedUrl)).json.professionals, [
      { id: owner.id, name: owner.name, eligible: true },
    ]);
    const ownedHistory = (await api("/work-history", owner)).json.history;
    assert.equal(ownedHistory.length, 2, "The owner's existing role must be deduplicated");
    const ownedRolePath = "/work-history/" + ownedHistory[0].id;
    assert.equal((await api(ownedRolePath, { ...other, method: "PUT", body: sharedRole })).status, 404);
    assert.equal((await api(ownedRolePath, { ...owner, method: "PUT", body: sharedRole })).status, 204);
    const delivered = (await api("/ratings/mine", owner)).json.received;
    assert.deepEqual(delivered.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)), [
      { id: privateDraftRating.json.id, name: "Anonymous colleague" },
      { id: namedDraftRating.json.id, name: restoredBob.name },
    ]);

    const auth = new AuthService(db, app.get(LinkedInService));
    assert.equal((await auth.sessionUser({ cookies: { sid: alice.cookie.split("=")[1] } })).id, alice.id);
    await db.pool.query("UPDATE sessions SET expires_at = now() WHERE user_id = $1", [alice.id]);
    assert.equal((await api("/auth/session", alice)).status, 204);
    assert.equal((await api("/auth/logout", { ...restoredBob, method: "POST" })).status, 204);
    assert.equal((await api("/auth/session", restoredBob)).status, 204);

    const simultaneous = await Promise.all([1, 2].map(() => join("simultaneous", "Concurrent Member")));
    assert.equal(simultaneous[0].id, simultaneous[1].id, "Concurrent first sign-ins must create one account");
    const operatorToken = await invite("operator");
    const operatorAttempt = await begin(operatorToken);
    assert.match((await complete("outside", operatorAttempt.state, operatorAttempt.browser)).headers.get("location"), /error=invite/);
    const { rows: [unused] } = await db.pool.query("SELECT redeemed_at, redeemed_by FROM invites WHERE digest=$1", [digest(operatorToken)]);
    assert.deepEqual(unused, { redeemed_at: null, redeemed_by: null });
    assert.equal((await api("/pilot/metrics", directMember)).status, 403);
  } finally {
    await app?.close();
    await admin.query("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
    await admin.end();
    process.env.DATABASE_URL = baseUrl;
  }
});
