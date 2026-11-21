import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { destinations, validateProfile } from "../profile-data.js";

const script = readFileSync(new URL("../extract-profile.js", import.meta.url), "utf8");
function capture(html, path = "/in/example/details/experience/") {
  const { document } = parseHTML("<html><head><title>Test Colleague | LinkedIn</title></head><body>" + html + "</body></html>");
  return JSON.parse(JSON.stringify(runInNewContext(script, {
    document, location: new URL("https://www.linkedin.com" + path), URL,
  })));
}

test("the popup opens safely as a normal HTML preview without extension APIs", () => {
  const html = readFileSync(new URL("../popup.html", import.meta.url), "utf8");
  const popupScript = readFileSync(new URL("../popup.js", import.meta.url), "utf8")
    .replace(/^import .* from .*;\n/, "");
  for (const chrome of [undefined, {}]) {
    const { document } = parseHTML(html);
    assert.doesNotThrow(() => runInNewContext(popupScript, { document, chrome }));
    assert.equal(document.getElementById("preview-note").hidden, false);
    assert.equal(document.getElementById("extension-controls").hidden, true);
    assert.equal(document.querySelector('a[href="http://localhost:4028/work-history"]').textContent, "Open local E-ProRate");
  }
});

test("captures grouped and individual roles while excluding sidebar and education", () => {
  const result = capture(`<main><h1>Test Colleague</h1>
    <a href="/company/1/"><p>Example Ltd</p><p>Full-time · 4 years</p></a>
    <a href="/company/1/"><p>Senior Engineer</p><p>Jan 2023 - Present · 2 yrs</p><p>Hybrid</p></a>
    <a href="/company/1/"><p>Engineer</p><p>2021 – 2023</p></a>
    <a href="/company/2/"><p>Developer</p><p>Earlier Company · Full-time</p><p>Sep 2019 - Dec 2020 · 1 yr</p></a>
    </main><aside><a href="/company/3/"><p>Unrelated person</p><p>Wrong Company</p><p>2018 – 2024</p></a></aside>`);
  assert.equal(result.name, "Test Colleague");
  assert.deepEqual(result.positions, [
    { company: "Example Ltd", title: "Senior Engineer", start: "Jan 2023", end: "Present" },
    { company: "Example Ltd", title: "Engineer", start: "2021", end: "2023" },
    { company: "Earlier Company", title: "Developer", start: "Sep 2019", end: "Dec 2020" },
  ]);
});

test("scopes the main profile to Experience and handles the earlier nested role layout", () => {
  const result = capture(`<main><h1>Test Colleague</h1>
    <section><div id="experience"></div><h2>Experience</h2><ul>
      <li><div class="t-bold"><span aria-hidden="true">Example Ltd</span></div><ul>
        <li><div class="t-bold"><span aria-hidden="true">Engineer</span><span class="visually-hidden">Duplicate title</span></div>
          <span aria-hidden="true">Jan 2021 - Present · 4 yrs</span>
        </li>
      </ul></li>
    </ul></section>
    <section><h2>Education</h2><a href="/company/99/"><p>Student</p><p>University</p><p>2011 – 2015</p></a></section>
    </main>`, "/in/example/");
  assert.deepEqual(result.positions, [{ company: "Example Ltd", title: "Engineer", start: "Jan 2021", end: "Present" }]);
  assert.match(capture("<main>Sign in</main>").error, /Experience/);
});

test("accepts only a bounded set of profile fields and rejects non-profile URLs", () => {
  const profile = { version: 1, name: "Colleague", linkedinProfileUrl: "https://uk.linkedin.com/in/EXAMPLE/",
    positions: [{ company: "Company", title: "Engineer", start: "2021", end: "Present", privateExtra: "excluded" }],
    cookies: "excluded" };
  const valid = validateProfile(profile);
  assert.equal(valid.linkedinProfileUrl, "https://www.linkedin.com/in/example/");
  assert.equal(valid.cookies, undefined);
  assert.equal(valid.positions[0].privateExtra, undefined);
  for (const url of ["https://linkedin.com.evil.example/in/example/", "https://www.linkedin.com/company/example/", "http://www.linkedin.com/in/example/"]) {
    assert.throws(() => validateProfile({ ...profile, linkedinProfileUrl: url }));
  }
});

test("binds the handoff to the selected destination and tab and consumes it once", async () => {
  const records = {};
  const tabs = [];
  globalThis.chrome = {
    runtime: { id: "test-extension", getURL: path => "chrome-extension://test-extension/" + path, onMessage: { addListener() {} } },
    storage: { session: {
      async get(key) { return structuredClone(key === null ? records : { [key]: records[key] }); },
      async set(value) { Object.assign(records, structuredClone(value)); },
      async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete records[key]; },
    } },
    tabs: { async create({ url }) { const tab = { id: tabs.length + 1, url }; tabs.push(tab); return tab; } },
  };
  const { handleMessage } = await import("../background.js");
  const popup = { id: chrome.runtime.id, url: chrome.runtime.getURL("popup.html") };
  const profile = { version: 1, name: "Colleague", linkedinProfileUrl: "https://www.linkedin.com/in/example/",
    positions: [{ company: "Company", title: "Engineer", start: "2021", end: "Present" }] };
  await assert.rejects(handleMessage({ type: "QUEUE_PROFILE", destination: "https://unrelated.example", profile }, popup));
  await handleMessage({ type: "QUEUE_PROFILE", destination: destinations[0], profile }, popup);
  const tab = tabs[0];
  const token = new URL(tab.url).searchParams.get("token");
  assert.equal(new URL(tab.url).searchParams.has("name"), false);
  const sender = { id: chrome.runtime.id, tab, url: tab.url };
  await assert.rejects(handleMessage({ type: "READ_PROFILE", token }, { ...sender, tab: { id: 99 } }));
  await assert.rejects(handleMessage({ type: "READ_PROFILE", token }, { ...sender, url: destinations[1] + "/browser-import?token=" + token }));
  assert.deepEqual((await handleMessage({ type: "READ_PROFILE", token }, sender)).profile, profile);
  await handleMessage({ type: "ACK_PROFILE", token }, {
    ...sender, url: destinations[0] + "/colleague-drafts?import=" + token,
  });
  await assert.rejects(handleMessage({ type: "READ_PROFILE", token }, sender), /expired/);
  await handleMessage({ type: "QUEUE_PROFILE", destination: destinations[0], profile }, popup);
  const expiredTab = tabs[1];
  const expiredToken = new URL(expiredTab.url).searchParams.get("token");
  records["import:" + expiredToken].expiresAt = 0;
  await assert.rejects(handleMessage({ type: "READ_PROFILE", token: expiredToken }, { ...sender, tab: expiredTab, url: expiredTab.url }), /expired/);
  delete globalThis.chrome;
});

test("the app relay rejects messages from other windows and origins", async () => {
  const token = crypto.randomUUID();
  const calls = [];
  const posts = [];
  let listener;
  const window = {
    addEventListener(_type, callback) { listener = callback; },
    postMessage(message, origin) { posts.push({ message, origin }); },
  };
  const location = new URL(destinations[0] + "/browser-import?token=" + token);
  runInNewContext(readFileSync(new URL("../relay.js", import.meta.url), "utf8"), {
    window, location, URL, chrome: { runtime: { async sendMessage(message) {
      calls.push(message);
      return { ok: true, profile: { name: "Colleague" } };
    } } },
  });
  const data = { type: "EPRORATE_IMPORT_REQUEST", token };
  await listener({ source: {}, origin: location.origin, data });
  await listener({ source: window, origin: "https://www.linkedin.com", data });
  assert.equal(calls.length, 0);
  await listener({ source: window, origin: location.origin, data });
  assert.equal(calls[0].type, "READ_PROFILE");
  assert.equal(posts[0].message.type, "EPRORATE_IMPORT_RESULT");
  assert.equal(posts[0].origin, location.origin);
});

test("the app preview survives sign-in and clears after save or expiry", async () => {
  const memory = new Map();
  globalThis.sessionStorage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key),
  };
  const { storeBrowserImport, pendingBrowserImport, clearBrowserImport } = await import("../../client/src/utils/browserImport.ts");
  const token = crypto.randomUUID();
  const profile = { version: 1, name: "Colleague", linkedinProfileUrl: "https://www.linkedin.com/in/example/",
    positions: [{ company: "Company", title: "Engineer", start: "2021", end: "Present" }] };
  storeBrowserImport(token, profile);
  assert.deepEqual(pendingBrowserImport(token).profile, profile);
  assert.equal(pendingBrowserImport(crypto.randomUUID()), null);
  assert.equal(pendingBrowserImport().token, token);
  clearBrowserImport(token);
  assert.equal(pendingBrowserImport(), null);
  storeBrowserImport(token, profile);
  const stored = JSON.parse(memory.get("eprorate.browserImport"));
  memory.set("eprorate.browserImport", JSON.stringify({ ...stored, expiresAt: 0 }));
  assert.equal(pendingBrowserImport(), null);
  delete globalThis.sessionStorage;
});
