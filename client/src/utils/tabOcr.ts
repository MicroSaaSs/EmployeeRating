import { createWorker, PSM, type Worker } from "tesseract.js";
import { linkedInHeaderRegions, linkedInHeaderText, mergeCapturedRoles, parseLinkedInScreenText, type CapturedRole } from "./linkedinTabCapture";

/** Re-read the three-line job headers at high resolution instead of trusting flattened page text. */
export async function recognizeLinkedInView(worker: Worker, canvas: HTMLCanvasElement, active: () => boolean, previousGroup = "") {
  const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
  if (!active()) return undefined;
  const raw = linkedInHeaderText(data, canvas.width);
  const initial = parseLinkedInScreenText(raw, previousGroup);
  const regions = linkedInHeaderRegions(data, canvas.width, canvas.height);
  if (!regions.length) return { roles: initial.roles, group: initial.group, text: raw, unclear: 0, skipped: 0 };
  const roles: CapturedRole[] = [];
  const texts: string[] = [];
  let unclear = 0;
  let skipped = 0;
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  try {
    for (const region of regions) {
      if (!active()) return undefined;
      // Read this header again in an overlapping view rather than inventing a role from clipped text.
      if (region.incomplete) { skipped++; continue; }
      const header = document.createElement("canvas");
      const scale = Math.min(3, 3000 / region.width);
      header.width = Math.round(region.width * scale); header.height = Math.round(region.height * scale);
      try {
        const context = header.getContext("2d");
        if (!context) throw new Error("Could not prepare a job header.");
        context.fillStyle = "white"; context.fillRect(0, 0, header.width, header.height);
        context.drawImage(canvas, region.left, region.top, region.width, region.height, 0, 0, header.width, header.height);
        const result = await worker.recognize(header, {}, { text: true, blocks: true });
        if (!active()) return undefined;
        // Header-local OCR retains uncertain words for explicit review rather than dropping a role.
        const text = linkedInHeaderText(result.data, header.width);
        const originalRole = initial.roles.find(role => role.start === region.start && role.end === region.end);
        const groupedRole = initial.groupedRoles.find(role => role.start === region.start && role.end === region.end);
        const parsed = parseLinkedInScreenText(text, groupedRole?.company || (originalRole ? "" : previousGroup));
        const role = parsed.roles.find(candidate => candidate.start === region.start) ?? parsed.roles[0];
        const uncertain = result.data.confidence < 65;
        if (role) {
          roles.push({ ...role, ...(uncertain ? { needsReview: true } : {}) });
          texts.push(text);
          if (uncertain) unclear++;
        } else {
          // A dated header was visible, but its text was incomplete. Keep a reviewable placeholder.
          roles.push({ company: "", title: "", start: region.start, end: region.end, needsReview: true });
          texts.push(`[unreadable job title]\n[unreadable company]\n${region.start} - ${region.end}`);
          unclear++;
        }
      } finally { header.width = 0; header.height = 0; }
    }
  } finally { if (active()) await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN }); }
  return { roles: mergeCapturedRoles([], roles), group: initial.group, text: texts.join("\n[unreadable line]\n"), unclear, skipped };
}

export async function createTabOcrWorker(progress: (status: string) => void, language: "eng" | "eng+rus" = "eng"): Promise<Worker> {
  const base = new URL("/ocr/", location.origin).href;
  const worker = await createWorker(language === "eng" ? ["eng"] : ["eng", "rus"], 1, {
    workerPath: base + "worker.min.js", corePath: base + "core", langPath: base + "lang",
    workerBlobURL: false, legacyCore: false, legacyLang: false, gzip: true,
    errorHandler: () => undefined,
    logger: entry => {
      if (entry.status === "recognizing text") progress("Reading visible text… " + Math.round(entry.progress * 100) + "%");
      else if (entry.status.includes("language")) progress("Loading language files for local text recognition…");
      else progress("Preparing local text recognition…");
    },
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: "1" });
  return worker;
}
