import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { currentPosition, linkedInPosition, type LinkedInPosition } from "./linkedinPositions";

interface ProfileLine {
  text: string;
  x: number;
  y: number;
  size: number;
}

function profileLines(items: TextItem[]) {
  const words = items.filter(item => item.str.trim()).map(item => ({
    text: item.str,
    x: item.transform[4],
    y: item.transform[5],
    size: Math.hypot(item.transform[0], item.transform[1]),
    width: item.width,
  })).sort((a, b) => b.y - a.y);
  const rows: Array<typeof words> = [];
  for (const word of words) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - word.y) < 1) row.push(word);
    else rows.push([word]);
  }

  const lines: ProfileLine[] = [];
  for (const row of rows) {
    let line: ProfileLine | undefined;
    let right = 0;
    for (const word of row.sort((a, b) => a.x - b.x)) {
      const gap = word.x - right;
      // LinkedIn places a separate sidebar in the same horizontal text rows.
      if (!line || gap > 15) {
        line = { text: word.text, x: word.x, y: word.y, size: word.size };
        lines.push(line);
      } else {
        const space = gap > 0.5 && !/\s$/.test(line.text) && !/^\s/.test(word.text) ? " " : "";
        line.text += space + word.text;
      }
      right = word.x + word.width;
    }
  }
  return lines;
}

const experienceHeading = /^(?:experience|work experience|опыт работы)$/iu;
const date = /^(?:[\p{L}.]+\s+)?[1-9]\d{3}(?:-\d{2}(?:-\d{2})?)?$/u;

export function parseLinkedInProfilePages(pages: TextItem[][]) {
  let heading: ProfileLine | undefined;
  let company = "";
  let title = "";
  const positions: LinkedInPosition[] = [];

  for (const page of pages) {
    let previous: ProfileLine | undefined;
    for (const line of profileLines(page)) {
      const text = line.text.trim();
      if (!heading) {
        if (experienceHeading.test(text)) heading = line;
        continue;
      }
      if (line.x < heading.x - 2) continue;
      const size = line.size * 15.75 / heading.size;
      if (Math.abs(line.x - heading.x) < 2 && Math.abs(size - 15.75) < 0.25) return finish();
      const wrapped = previous && Math.abs(line.x - previous.x) < 2 &&
        Math.abs(line.size - previous.size) < 0.25 && previous.y - line.y < line.size * 1.45;
      previous = line;

      // The LinkedIn export distinguishes employer, title, and dates by font size.
      if (Math.abs(size - 12) < 0.25) {
        company = wrapped ? company + " " + text : text;
        title = "";
      } else if (Math.abs(size - 11.5) < 0.25) {
        title = wrapped ? title + " " + text : text;
      } else if (company && title && Math.abs(size - 10.5) < 0.25) {
        const [start, end, ...extra] = text.replace(/\s*\([^)]*\)$/, "").split(/\s+-\s+|\s*[–—]\s*/);
        if (end && !extra.length && date.test(start) && (date.test(end) || currentPosition.test(end))) {
          positions.push(linkedInPosition(positions.length, company, title, start, end));
          title = "";
        }
      }
    }
  }
  return finish();

  function finish() {
    if (!positions.length) {
      throw new Error("No dated experience was found. Choose a PDF saved from your LinkedIn profile or use Positions.csv.");
    }
    return positions;
  }
}

export function parseLinkedInColleaguePages(pages: TextItem[][]) {
  const positions = parseLinkedInProfilePages(pages);
  const lines = profileLines(pages[0]);
  const heading = lines.find(line => experienceHeading.test(line.text.trim()));
  const nameLine = lines.filter(line => line.size > 18 && (!heading || Math.abs(line.x - heading.x) < 2))
    .sort((a, b) => b.size - a.size)[0];
  return { name: nameLine?.text.trim() ?? "", positions };
}

export async function readLinkedInColleagueProfile(file: File) {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    data: await file.arrayBuffer(),
    enableXfa: false,
    useWasm: false,
    stopAtErrors: true,
    verbosity: 0,
  });
  try {
    const document = await task.promise;
    const pages: TextItem[][] = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const { items } = await page.getTextContent();
      pages.push(items.filter(item => "str" in item));
    }
    return parseLinkedInColleaguePages(pages);
  } finally {
    await task.destroy();
  }
}

export async function readLinkedInProfile(file: File) {
  return (await readLinkedInColleagueProfile(file)).positions;
}
