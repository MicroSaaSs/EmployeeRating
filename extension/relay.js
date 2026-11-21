(() => {
  if (location.pathname !== "/browser-import") return;
  const token = new URL(location.href).searchParams.get("token");
  if (!/^[0-9a-f-]{36}$/.test(token ?? "")) return;
  window.addEventListener("message", async event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.token !== token) return;
    const type = event.data.type;
    if (!["EPRORATE_IMPORT_REQUEST", "EPRORATE_IMPORT_ACK"].includes(type)) return;
    try {
      const result = await chrome.runtime.sendMessage({
        type: type === "EPRORATE_IMPORT_ACK" ? "ACK_PROFILE" : "READ_PROFILE", token,
      });
      if (type === "EPRORATE_IMPORT_REQUEST") {
        window.postMessage({ type: "EPRORATE_IMPORT_RESULT", token, ...result }, location.origin);
      }
    } catch {
      window.postMessage({
        type: "EPRORATE_IMPORT_RESULT", token, ok: false,
        error: "The extension was reloaded. Import this profile again from LinkedIn.",
      }, location.origin);
    }
  });
})();
