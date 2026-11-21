import { BadRequestException } from "@nestjs/common";

export function linkedInProfileUrl(value: unknown): string {
  const invalid = () => new BadRequestException("Use a LinkedIn profile link such as https://www.linkedin.com/in/your-name/.");
  if (typeof value !== "string" || value.length > 512) throw invalid();
  const input = value.trim();
  if (/\s|\\/.test(input)) throw invalid();
  const address = /^https?:\/\//i.test(input) ? input : "https://" + input;
  let url: URL;
  let slug: string;
  try {
    url = new URL(address);
    const path = /^\/in\/([^/]+)\/?$/.exec(url.pathname);
    if (!path) throw invalid();
    slug = decodeURIComponent(path[1]).normalize("NFC").toLowerCase();
  } catch {
    throw invalid();
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port ||
      !/^(?:(?:www|[a-z]{2,3})\.)?linkedin\.com$/i.test(url.hostname) ||
      !/^[\p{L}\p{N}_-]{1,200}$/u.test(slug)) throw invalid();
  return "https://www.linkedin.com/in/" + encodeURIComponent(slug) + "/";
}

export function colleagueSearch(value: unknown) {
  if (typeof value === "string" && /^(?:https?:\/\/|(?:[\w-]+\.)?linkedin\.com\/)/i.test(value.trim())) {
    return { term: "", profileUrl: linkedInProfileUrl(value) };
  }
  if (value === undefined) return { term: "", profileUrl: null };
  if (typeof value !== "string" || value.length > 120 || value.includes("\0")) {
    throw new BadRequestException("Use a name of up to 120 characters or a LinkedIn profile link.");
  }
  return { term: value.trim(), profileUrl: null };
}
