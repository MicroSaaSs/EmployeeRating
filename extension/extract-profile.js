(() => {
  const source = new URL(location.href);
  const path = /^\/in\/([^/]+)(?:\/details\/experience)?\/?$/.exec(source.pathname);
  if (source.protocol !== "https:" || !/^(?:[a-z]{2,3}\.|www\.)?linkedin\.com$/i.test(source.hostname) || !path) {
    return { error: "Open a LinkedIn member profile first." };
  }
  const main = document.querySelector("main, [role=main]");
  if (!main) return { error: "The profile is still loading. Wait for Experience to appear and try again." };
  const experienceName = /^(?:experience|опыт работы)$/i;
  let scope = document.querySelector("#experience")?.closest("section") ??
    document.querySelector(".experience-section");
  if (!scope && source.pathname.includes("/details/experience")) scope = main;
  if (!scope) {
    const heading = [...main.querySelectorAll("h2, p")].find(element => experienceName.test(element.textContent.trim()));
    for (let parent = heading?.parentElement; parent && parent !== main; parent = parent.parentElement) {
      if (parent.querySelector('a[href*="/company/"]')) {
        scope = parent;
        break;
      }
    }
  }
  if (!scope) return { error: "Scroll to Experience or open Show all experiences, then import again." };

  const normalize = text => text.replace(/\s+/g, " ").trim();
  function visibleText(element) {
    const clone = element.cloneNode(true);
    for (const hidden of clone.querySelectorAll(".visually-hidden, .sr-only, [hidden], script, style")) hidden.remove();
    return normalize(clone.textContent);
  }
  function lines(element) {
    const items = [...element.querySelectorAll("p")];
    const spans = items.length ? items : [...element.querySelectorAll('span[aria-hidden="true"]')];
    return spans.filter(node => !node.closest(".visually-hidden, [hidden]"))
      .map(visibleText).filter((text, index, all) => text && text !== all[index - 1]);
  }
  function dates(text) {
    const match = /^((?:[\p{L}.]+\s+)?[1-9]\d{3})\s*(?:[-–—]|to|по)\s*((?:[\p{L}.]+\s+)?[1-9]\d{3}|Present|Current|настоящее время|по настоящее время)(?:\s*[·•(]|\s*$)/iu.exec(text);
    return match ? { start: match[1], end: match[2] } : null;
  }
  const companyNames = new Map();
  const positions = [];
  const seen = new Set();
  function add(company, title, range) {
    if (!company || !title || !range || /\*{3}/.test(company + title)) return;
    const entry = { company: company.slice(0, 240), title: title.slice(0, 240), ...range };
    const key = JSON.stringify(entry);
    if (!seen.has(key) && positions.length < 50) {
      seen.add(key);
      positions.push(entry);
    }
  }
  for (const anchor of scope.querySelectorAll('a[href*="/company/"]')) {
    if (anchor.closest("[hidden], .visually-hidden")) continue;
    const text = lines(anchor);
    if (!text.length) continue;
    const companyUrl = new URL(anchor.getAttribute("href"), source.origin).pathname;
    const dateIndex = text.findIndex(text => dates(text));
    if (dateIndex < 0) {
      companyNames.set(companyUrl, text[0]);
      continue;
    }
    const company = dateIndex >= 2 ? text[1].split(/\s+[·•]\s+/)[0] : companyNames.get(companyUrl);
    add(company, text[0], dates(text[dateIndex]));
  }
  // LinkedIn's earlier profile layout uses nested list items and bold spans.
  if (!positions.length) {
    for (const item of scope.querySelectorAll("li")) {
      if (item.querySelector("li")) continue;
      const text = lines(item);
      const dateIndex = text.findIndex(text => dates(text));
      if (dateIndex < 0) continue;
      const title = visibleText(item.querySelector('.t-bold span[aria-hidden="true"]') ?? item.querySelector(".t-bold") ?? item);
      let company = dateIndex >= 2 ? text[1].split(/\s+[·•]\s+/)[0] : "";
      if (!company) {
        const group = item.parentElement?.closest("li");
        const companyNode = group?.querySelector('.t-bold span[aria-hidden="true"], .t-bold');
        if (companyNode) company = visibleText(companyNode);
      }
      add(company, title, dates(text[dateIndex]));
    }
  }
  if (!positions.length) return { error: "No readable employment dates were found. Expand Experience and try again, or import a saved PDF." };
  const name = normalize(main.querySelector("h1")?.textContent ??
    document.title.replace(/\s*\|\s*LinkedIn.*$/i, "").replace(/^\(\d+\)\s*/, "")).slice(0, 150);
  const linkedinProfileUrl = "https://www.linkedin.com/in/" + path[1] + "/";
  return { version: 1, linkedinProfileUrl, name, positions };
})();
