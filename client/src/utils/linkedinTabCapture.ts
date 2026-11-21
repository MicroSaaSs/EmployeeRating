export interface CapturedRole { company: string; title: string; start: string; end: string; needsReview?: boolean }
export interface CaptureArea { x: number; y: number; width: number; height: number }
export const fullCaptureArea: CaptureArea = { x: 0, y: 0, width: 1, height: 1 };

// The Captured Surface Control API is not yet included in TypeScript's DOM declarations.
export interface TabCaptureController extends EventTarget {
  readonly zoomLevel: number | null;
  getSupportedZoomLevels(): number[];
  decreaseZoomLevel(): Promise<void>;
  increaseZoomLevel(): Promise<void>;
  resetZoomLevel(): Promise<void>;
  forwardWheel?(element: HTMLElement | null): Promise<void>;
  setFocusBehavior?(behavior: "no-focus-change"): void;
}

export function createTabCaptureController(scope: { CaptureController?: new () => TabCaptureController }) {
  if (typeof scope.CaptureController !== "function") return undefined;
  try {
    const controller = new scope.CaptureController();
    return ["getSupportedZoomLevels", "decreaseZoomLevel", "increaseZoomLevel", "resetZoomLevel"].every(key =>
      typeof (controller as unknown as Record<string, unknown>)[key] === "function") ? controller : undefined;
  } catch { return undefined; }
}

export function linkedInTabUrl(value: string) {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : "https://" + value.trim()); }
  catch { throw new Error("Enter a LinkedIn profile link first."); }
  const match = /^\/in\/([^/]+)(?:\/details\/experience)?\/?$/.exec(url.pathname);
  let slug = "";
  try { slug = decodeURIComponent(match?.[1] ?? "").normalize("NFC").toLowerCase(); } catch { /* Invalid links are rejected below. */ }
  if (!/^https?:$/.test(url.protocol) || !/^(?:(?:www|[a-z]{2,3})\.)?linkedin\.com$/i.test(url.hostname) ||
      url.username || url.password || url.port || !/^[\p{L}\p{N}_-]{1,200}$/u.test(slug)) {
    throw new Error("Use a LinkedIn member profile link such as https://www.linkedin.com/in/your-name/.");
  }
  return "https://www.linkedin.com/in/" + encodeURIComponent(slug) + "/";
}

export function stopSharedTab(stream?: Pick<MediaStream, "getTracks"> | null) {
  stream?.getTracks().forEach(track => track.stop());
}

export function requireSharedTab(stream: MediaStream) {
  const tracks = stream.getVideoTracks();
  if (tracks.length !== 1 || tracks[0].getSettings().displaySurface !== "browser") {
    stopSharedTab(stream);
    throw new Error("Choose only the LinkedIn browser tab, not a window or entire screen. Use desktop Chrome or Edge if tab sharing is unavailable.");
  }
  stream.getAudioTracks().forEach(track => track.stop());
  return tracks[0];
}

const normalize = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim();
const employment = /^(?:full[ -]time|part[ -]time|contract|freelance|self.employed|internship|temporary|полная занятость|частичная занятость|проектная работа)(?:\b|\s|[·•|]|$)/iu;
const ignored = /^(?:experience|work experience|опыт работы|show all.*|see more|see less|показать.*|навыки[: ].*|skills[: ].*|remote|hybrid|on.site|удаленно|удалённо|гибридный формат|\d+\s+(?:skills?|навык.*)|\d+\s+(?:yrs?|years?|mos?|months?|лет|года?|мес\.?)(?:\s.*)?)$/iu;
const endSection = /^(?:education|образование|licenses.*|certifications|сертификаты|recommendations|рекомендации|people also viewed|people you may know)$/iu;
const jobWords = /\b(?:engineer|developer|manager|director|specialist|technician|analyst|designer|consultant|lead|architect|officer|head|intern)\b|разработчик|инженер|менеджер/iu;
const companyWords = /(?:\b(?:ltd|inc|llc|corp|corporation|company|oao|jsc|gmbh)\b|\bco\.$)/iu;
function detailLine(line: string) {
  return /^(?:tech(?:nologies)?|skills?|location|навыки)\s*:/iu.test(line) ||
    /,.*\b(?:district|israel|russia|область|регион)\b/iu.test(line) ||
    ((line.match(/,/g)?.length ?? 0) >= 2 && !jobWords.test(line) && !companyWords.test(line));
}

function captureEnd(value: string) {
  return value.split(/\s*[·•|]\s*/)[0]
    .replace(/\s*(?:[-–—]\s*)?\(?\d+\s*(?:yrs?|years?|mos?|months?|лет|года?|мес\.?)(?:\s.*)?$/iu, "")
    .replace(/(?<=\d{4})\s+(?:yan|yrs?|years?)$/iu, "").replace(/\s*[-–—]\s*$/, "").trim();
}

/** A small grayscale sample, compared before OCR so scrolling frames are never read. */
export function captureChanged(first: Uint8Array | undefined, next: Uint8Array) {
  if (!first || first.length !== next.length || !next.length) return true;
  let different = 0;
  let total = 0;
  for (let index = 0; index < next.length; index++) {
    const delta = Math.abs(first[index] - next[index]);
    total += delta;
    if (delta > 20) different++;
  }
  return total / next.length > 2 || different / next.length > 0.02;
}

function dateRange(line: string) {
  const source = line.replace(/\b0ct(?=\.?\s*\d)/gi, "Oct").replace(/([\p{L}.]+)([12]\d{3})/gu, "$1 $2");
  const match = /^((?:[\p{L}.]+\s+)?[12]\d{3}(?:-(?:0[1-9]|1[0-2])(?:-[0-3]\d)?)?)\s*[-–—−]\s*(.+)$/iu.exec(source);
  if (!match) return null;
  const end = captureEnd(match[2]);
  if (!end || end.length > 60) return null;
  return { start: match[1], end };
}

function companyName(line: string) {
  const parts = line.split(/\s*[·•|]\s*|\s+-\s+/);
  return parts.length > 1 && parts.slice(1).some(part => employment.test(part)) ? parts[0].trim() : line;
}

export interface OcrWord { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }
interface OcrLine { text: string; words: OcrWord[] }
export interface OcrPage { text: string; blocks: { paragraphs: { lines: OcrLine[] }[] }[] | null }

/** Exclude detached right-edge edit icons without stripping numbers from genuine job titles. */
export function linkedInHeaderText(page: OcrPage, width: number) {
  const lines = page.blocks?.flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines));
  if (!lines?.length) return page.text.trim();
  return lines.map(line => {
    const words = [...line.words].sort((first, next) => first.bbox.x0 - next.bbox.x0);
    const gap = words.findIndex((word, index) => {
      if (!index || word.bbox.x0 < width * 0.55) return false;
      const previous = words[index - 1];
      const height = Math.max(1, word.bbox.y1 - word.bbox.y0, previous.bbox.y1 - previous.bbox.y0);
      return word.bbox.x0 - previous.bbox.x1 > height * 4;
    });
    // Headers can share a baseline with recommendations/sidebar text outside the Experience column.
    if (gap >= 0) words.splice(gap);
    while (words.length) {
      const last = words[words.length - 1];
      const previous = words[words.length - 2];
      const height = Math.max(1, last.bbox.y1 - last.bbox.y0, previous ? previous.bbox.y1 - previous.bbox.y0 : 0);
      const icon = /^(?:[\dVvYy√/\\><✎✏↗]{1,4}|present)$/iu.test(last.text.trim());
      const detached = !previous || last.bbox.x0 - previous.bbox.x1 > height * 3;
      if (!icon || !detached || last.bbox.x0 < width * 0.65) break;
      words.pop();
    }
    return words.map(word => word.text).join(" ").trim();
  }).filter(Boolean).join("\n").slice(0, 30000);
}

/** Locate compact title/employer/date headers. Long descriptions and media cards stay out. */
export function linkedInHeaderRegions(page: OcrPage, width: number, height: number) {
  const lines = page.blocks?.flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines)) ?? [];
  const regions: { left: number; top: number; width: number; height: number; start: string; end: string; incomplete?: boolean }[] = [];
  for (const line of lines) {
    if (endSection.test(normalize(line.text))) break;
    for (let index = 0; index < Math.min(4, line.words.length); index++) {
      const range = dateRange(line.words.slice(index).map(word => word.text).join(" "));
      if (!range) continue;
      const date = line.words[index];
      const rowHeight = Math.max(8, date.bbox.y1 - date.bbox.y0);
      const left = Math.max(0, Math.floor(date.bbox.x0 - rowHeight * 0.25));
      const preceding = lines.flatMap(candidate => {
        const words = candidate.words.filter(word => word.bbox.x0 >= date.bbox.x0 - rowHeight * 0.5);
        if (!words.length || ignored.test(normalize(candidate.text))) return [];
        const y0 = Math.min(...words.map(word => word.bbox.y0));
        const y1 = Math.max(...words.map(word => word.bbox.y1));
        return y1 < date.bbox.y0 && y1 > date.bbox.y0 - rowHeight * 8 ? [{ y0 }] : [];
      }).sort((a, b) => b.y0 - a.y0).slice(0, 2);
      // Font sizes and line spacing vary: retain the actual heading's full glyph height.
      const top = Math.max(0, Math.floor(Math.min(date.bbox.y0 - rowHeight * 4.5, ...preceding.map(line => line.y0 - rowHeight * 0.25))));
      const bottom = Math.min(height, Math.ceil(Math.max(...line.words.map(word => word.bbox.y1)) + rowHeight * 0.25));
      const month = /^([\p{L}.]+)\s+[12]\d{3}/u.exec(range.start)?.[1].toLowerCase().replace(/\./g, "").slice(0, 3);
      const knownMonth = !month || ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "янв", "фев", "мар", "апр", "май", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"].includes(month);
      const incomplete = !knownMonth || date.bbox.y0 < 2 || bottom >= height - Math.max(2, rowHeight * 0.3);
      if (!regions.some(region => Math.abs(region.top - top) < rowHeight && Math.abs(region.left - left) < rowHeight)) {
        regions.push({ left, top, width: Math.max(1, width - left), height: Math.max(1, bottom - top), ...range, ...(incomplete ? { incomplete: true } : {}) });
      }
      break;
    }
    if (regions.length >= 20) break;
  }
  return regions.sort((a, b) => a.top - b.top);
}

/** Read the aligned text column, rather than treating employer logos as words. */
export function linkedInOcrText(page: OcrPage) {
  const lines = page.blocks?.flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines));
  if (!lines?.length) return page.text.slice(0, 30000);
  const anchors: number[] = [];
  for (const line of lines) {
    for (let index = 0; index < Math.min(4, line.words.length); index++) {
      if (dateRange(line.words.slice(index).map(word => word.text).join(" "))) {
        anchors.push(line.words[index].bbox.x0);
        break;
      }
    }
  }
  // Date labels share the left edge of the title and employer text on LinkedIn.
  const anchor = anchors.length ? anchors.sort((a, b) => a - b)[Math.floor(anchors.length / 2)] : undefined;
  return lines.map(line => {
    let words = line.words.filter(word => /[\p{L}\p{N}]/u.test(word.text));
    if (anchor !== undefined) words = words.filter(word => word.bbox.x0 >= anchor - (word.bbox.y1 - word.bbox.y0) * 0.4);
    while (words.length && words[0].text.length <= 2 && words[0].confidence < 65) words.shift();
    while (words.length && words[words.length - 1].text.length <= 2 && words[words.length - 1].confidence < 65) words.pop();
    // Keep punctuation separators from the original words after trimming the edges.
    if (!words.length) return "[unreadable line]";
    const first = line.words.indexOf(words[0]);
    const last = line.words.indexOf(words[words.length - 1]);
    words = line.words.slice(first, last + 1);
    const letters = words.filter(word => /[\p{L}\p{N}]/u.test(word.text));
    const average = letters.reduce((sum, word) => sum + word.confidence, 0) / letters.length;
    if (average < 65 || letters.some(word => word.text.length > 2 && word.confidence < 35)) return "[unreadable line]";
    return words.map(word => word.text).join(" ");
  }).join("\n").slice(0, 30000);
}

function cleanTitle(title: string, end: string) {
  // LinkedIn's small verification icon is sometimes read as V4, including sticky-header text after it.
  let result = title.replace(/\s+(?:V4|√4|\\\/4)(?:\s.*)?$/u, "");
  result = result.replace(/^(?:Al|A1)(?=\s+(?:Software\s+)?(?:Engineer|Developer|Architect|Researcher)\b)/u, "AI");
  if (/^(?:present|current)$/i.test(end)) result = result.replace(/\s+(?:present|current)$/i, "");
  return result.trim();
}

export function capturedRoleKey(role: CapturedRole) {
  const cleanedEnd = captureEnd(role.end);
  const end = /^(?:present|current|настоящее время|по настоящее время|по н\.\s?в\.)$/iu.test(cleanedEnd) ? "present" : cleanedEnd;
  return [role.company, cleanTitle(role.title, end), role.start, end].map(value => normalize(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")).join("|");
}

export function parseLinkedInScreenText(text: string, previousGroup = "") {
  const lines = text.slice(0, 30000).split(/\r?\n/).map(line => normalize(line.replace(/^[•·|○©®]+\s*/, ""))).filter(Boolean);
  const heading = lines.findIndex(line => /^(?:experience|work experience|опыт работы)$/iu.test(line));
  const content = heading >= 0 ? lines.slice(heading + 1) : lines;
  let group = previousGroup;
  let candidates: string[] = [];
  const roles: CapturedRole[] = [];
  const groupedRoles: CapturedRole[] = [];
  const seen = new Set<string>();
  for (const line of content) {
    if (endSection.test(line)) break;
    if (/^\[unreadable (?:line|job title|company)\]$/.test(line)) { candidates = []; continue; }
    const range = dateRange(line);
    if (range) {
      const title = group ? candidates[candidates.length - 1] : candidates[candidates.length - 2];
      const company = group || (candidates.length >= 2 ? companyName(candidates[candidates.length - 1]!) : "");
      if (title && company && title !== company) {
        const role = { company: company.slice(0, 240), title: cleanTitle(title, range.end).slice(0, 240), ...range };
        if (!role.title) { candidates = []; continue; }
        const key = capturedRoleKey(role);
        if (!seen.has(key)) { roles.push(role); seen.add(key); if (group) groupedRoles.push(role); }
      }
      candidates = [];
      if (roles.length >= 50) break;
      continue;
    }
    if (employment.test(line)) {
      const candidate = candidates[candidates.length - 1];
      const duration = /\d+\s*(?:yrs?|years?|mos?|months?|лет|года?|мес)/iu.test(line);
      if (candidate && (duration || (candidates.length === 1 && !jobWords.test(candidate)))) { group = candidate; candidates = []; }
      continue;
    }
    if (ignored.test(line) || detailLine(line)) continue;
    // An explicit employer plus employment type starts an individual role, even after a grouped employer.
    if (companyName(line) !== line || (candidates.length && companyWords.test(line) && !jobWords.test(line))) group = "";
    candidates.push(line);
    if (candidates.length > 8) candidates.shift();
  }
  return { roles, group, groupedRoles };
}

export function mergeCapturedRoles(existing: CapturedRole[], incoming: CapturedRole[], replacedKeys: ReadonlySet<string> = new Set()) {
  const result = existing.filter(role => !replacedKeys.has(capturedRoleKey(role)));
  const seen = new Set(result.map(capturedRoleKey));
  for (const role of incoming) {
    const key = capturedRoleKey(role);
    if (seen.has(key)) continue;
    if (role.company && role.title) {
      const pending = result.findIndex(saved => !saved.company && !saved.title && capturedRoleKey(saved).split("|").slice(2).join("|") === key.split("|").slice(2).join("|"));
      if (pending >= 0) { seen.delete(capturedRoleKey(result[pending])); result.splice(pending, 1); }
    } else if (result.some(saved => saved.company && saved.title && capturedRoleKey(saved).split("|").slice(2).join("|") === key.split("|").slice(2).join("|"))) continue;
    const similar = result.findIndex(saved => {
      const previous = capturedRoleKey(saved).split("|");
      const next = key.split("|");
      if (previous.slice(1).join("|") !== next.slice(1).join("|")) return false;
      const [short, long] = [previous[0], next[0]].sort((a, b) => a.length - b.length);
      // An isolated logo glyph preceding an otherwise identical employer is not another role.
      return short.length >= 6 && long.endsWith(short) && /^[a-z]{1,2}$/i.test(long.slice(0, -short.length));
    });
    if (similar >= 0) {
      if (role.company.length < result[similar].company.length) {
        seen.delete(capturedRoleKey(result[similar])); result[similar] = role; seen.add(key);
      }
    } else if (result.length < 50) { result.push(role); seen.add(key); }
  }
  return result;
}
