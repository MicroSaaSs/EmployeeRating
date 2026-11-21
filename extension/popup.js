import { destinations, profileUrl, validateProfile } from "./profile-data.js";

if (globalThis.chrome?.runtime?.id && globalThis.chrome?.storage?.local &&
    globalThis.chrome?.tabs?.query && globalThis.chrome?.scripting?.executeScript) {
  document.getElementById("preview-note").hidden = true;
  document.getElementById("extension-controls").hidden = false;

  const button = document.getElementById("import");
  const destination = document.getElementById("destination");
  const status = document.getElementById("status");
  chrome.storage.local.get("destination").then(settings => {
    if (destinations.includes(settings.destination)) destination.value = settings.destination;
  }).catch(() => {
    status.textContent = "Saved settings could not be loaded. Choose a destination below.";
  });

  button.addEventListener("click", async () => {
    button.disabled = true;
    destination.disabled = true;
    status.textContent = "Reading the open profile…";
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      profileUrl(tab?.url);
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, files: ["extract-profile.js"],
      });
      if (result.result?.error) throw new Error(result.result.error);
      const profile = validateProfile(result.result);
      await chrome.storage.local.set({ destination: destination.value });
      const reply = await chrome.runtime.sendMessage({ type: "QUEUE_PROFILE", destination: destination.value, profile });
      if (!reply.ok) throw new Error(reply.error);
      status.textContent = "Opened E-ProRate. Review the profile there before saving.";
    } catch (error) {
      status.textContent = error.message || "The profile could not be imported. Reload LinkedIn and try again.";
      button.disabled = false;
      destination.disabled = false;
    }
  });
}
