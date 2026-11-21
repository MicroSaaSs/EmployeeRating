import { destinations, importLifetime, validateProfile } from "./profile-data.js";

export async function handleMessage(message, sender) {
  if (sender.id !== chrome.runtime.id) throw new Error("Unknown extension sender.");
  if (message.type === "QUEUE_PROFILE") {
    if (sender.tab || !sender.url?.startsWith(chrome.runtime.getURL("popup.html"))) throw new Error("Open the extension popup to import.");
    if (!destinations.includes(message.destination)) throw new Error("Choose an E-ProRate destination.");
    const profile = validateProfile(message.profile);
    const all = await chrome.storage.session.get(null);
    const stale = Object.keys(all).filter(key => key.startsWith("import:") && all[key].expiresAt <= Date.now());
    if (stale.length) await chrome.storage.session.remove(stale);
    const token = crypto.randomUUID();
    const key = "import:" + token;
    await chrome.storage.session.set({ [key]: {
      profile, destination: message.destination, expiresAt: Date.now() + importLifetime, tabId: null,
    } });
    try {
      const tab = await chrome.tabs.create({ url: message.destination + "/browser-import?token=" + token });
      const { [key]: record } = await chrome.storage.session.get(key);
      await chrome.storage.session.set({ [key]: { ...record, tabId: tab.id } });
      return { ok: true };
    } catch (error) {
      await chrome.storage.session.remove(key);
      throw error;
    }
  }
  if (!["READ_PROFILE", "ACK_PROFILE"].includes(message.type) || !/^[0-9a-f-]{36}$/.test(message.token ?? "")) {
    throw new Error("Invalid import request.");
  }
  const key = "import:" + message.token;
  const { [key]: record } = await chrome.storage.session.get(key);
  if (!record || record.expiresAt <= Date.now()) {
    await chrome.storage.session.remove(key);
    throw new Error("This import has expired. Import the profile again from LinkedIn.");
  }
  const senderUrl = new URL(sender.url);
  const receiving = senderUrl.pathname === "/browser-import" && senderUrl.searchParams.get("token") === message.token;
  const reviewing = message.type === "ACK_PROFILE" && senderUrl.pathname === "/colleague-drafts" &&
    senderUrl.searchParams.get("import") === message.token;
  if (sender.tab?.id !== record.tabId || senderUrl.origin !== record.destination || !(receiving || reviewing)) {
    throw new Error("This import belongs to another E-ProRate tab.");
  }
  if (message.type === "ACK_PROFILE") {
    await chrome.storage.session.remove(key);
    return { ok: true };
  }
  return { ok: true, profile: record.profile };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  handleMessage(message, sender).then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});
