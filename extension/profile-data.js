export const destinations = [
  "http://localhost:4028",
  "https://e-prorate-client-001e23c9f3dd.herokuapp.com",
];
export const importLifetime = 15 * 60 * 1000;

export function profileUrl(value) {
  const url = new URL(value);
  const match = /^\/in\/([^/]+)(?:\/details\/experience)?\/?$/.exec(url.pathname);
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !/^(?:(?:www|[a-z]{2,3})\.)?linkedin\.com$/i.test(url.hostname) || !match) {
    throw new Error("Open a LinkedIn member profile or its Experience page first.");
  }
  const slug = decodeURIComponent(match[1]).normalize("NFC").toLowerCase();
  if (!/^[\p{L}\p{N}_-]{1,200}$/u.test(slug)) throw new Error("This LinkedIn profile link is invalid.");
  return "https://www.linkedin.com/in/" + encodeURIComponent(slug) + "/";
}

export function validateProfile(value) {
  if (!value || typeof value !== "object" || value.version !== 1 ||
      typeof value.name !== "string" || value.name.length > 150 ||
      !Array.isArray(value.positions) || value.positions.length < 1 || value.positions.length > 50) {
    throw new Error("The captured profile is incomplete. Open its Experience section and try again.");
  }
  const linkedinProfileUrl = profileUrl(value.linkedinProfileUrl);
  const positions = value.positions.map(position => {
    const output = {};
    for (const key of ["company", "title", "start", "end"]) {
      if (typeof position?.[key] !== "string" || position[key].length > 240 || position[key].includes("\0")) {
        throw new Error("The captured work history is invalid.");
      }
      output[key] = position[key].trim();
    }
    if (!output.company || !output.title) throw new Error("A role needs its company and job title.");
    return output;
  });
  return { version: 1, linkedinProfileUrl, name: value.name.trim(), positions };
}
