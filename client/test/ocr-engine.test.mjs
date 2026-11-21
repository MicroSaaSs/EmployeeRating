import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createWorker, PSM } from "tesseract.js";
import { linkedInOcrText, parseLinkedInScreenText } from "../src/utils/linkedinTabCapture.ts";

test("the local OCR models turn visible role pixels into reviewable work history", { timeout: 60000 }, async () => {
  const worker = await createWorker(["eng", "rus"], 1, {
    langPath: fileURLToPath(new URL("../public/ocr/lang", import.meta.url)), cacheMethod: "none", gzip: true,
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: "1" });
    const { data } = await worker.recognize(fileURLToPath(new URL("fixtures/experience.jpg", import.meta.url)), {}, { text: true, blocks: true });
    const { roles } = parseLinkedInScreenText(linkedInOcrText(data));
    assert.deepEqual(roles, [
      { company: "Example Company", title: "Senior Software Engineer", start: "Jan 2021", end: "Present" },
      { company: "Earlier Company", title: "Software Developer", start: "2018", end: "Dec 2020" },
    ]);
  } finally { await worker.terminate(); }
});
