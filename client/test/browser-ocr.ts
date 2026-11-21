import { createTabOcrWorker } from "../src/utils/tabOcr";
import { linkedInOcrText, parseLinkedInScreenText } from "../src/utils/linkedinTabCapture";

const button = document.querySelector<HTMLButtonElement>("#run")!;
const output = document.querySelector<HTMLPreElement>("#output")!;
button.addEventListener("click", async () => {
  button.disabled = true;
  const canvas = document.querySelector<HTMLCanvasElement>("#fixture")!;
  const image = new Image();
  image.src = document.querySelector<HTMLInputElement>("#image-url")?.value || "/__ocr-test/experience.svg";
  await image.decode();
  const scale = document.querySelector("#image-url") ? 2 : 1;
  canvas.width = image.naturalWidth * scale; canvas.height = image.naturalHeight * scale;
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const worker = await createTabOcrWorker(status => { output.textContent = status; });
  try {
    const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const parsed = parseLinkedInScreenText(linkedInOcrText(result.data));
    const expected = [document.querySelector<HTMLInputElement>("#expected-first")?.value || "Example Company", document.querySelector<HTMLInputElement>("#expected-second")?.value || "Earlier Company"];
    const pass = parsed.roles.length === 2 && parsed.roles[0].company === expected[0] && parsed.roles[1].company === expected[1];
    output.textContent = (pass ? "PASS" : "FAIL") + "\n" + JSON.stringify(parsed.roles, null, 2) + "\n\n" + result.data.text;
  } catch (error) { output.textContent = "FAIL " + String(error); }
  finally { await worker.terminate(); button.disabled = false; }
});
