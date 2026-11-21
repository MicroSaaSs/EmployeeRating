/** Real pixel regression: five dated roles separated by descriptions and a misleading media caption. */
import { createTabOcrWorker, recognizeLinkedInView } from "../src/utils/tabOcr";
const output = document.querySelector<HTMLPreElement>("#output")!;
document.querySelector<HTMLButtonElement>("#run")!.onclick = async () => {
  const image = new Image(); image.src = "/__tab-test/experience-detailed.svg"; await image.decode();
  const canvas = document.querySelector<HTMLCanvasElement>("#fixture")!;
  // Approximate the participant's zoomed-out source, then apply the app's initial 2x capture scale.
  const ratio = 0.67 * 2; canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const worker = await createTabOcrWorker(value => { output.textContent = value; });
  try {
    const result = await recognizeLinkedInView(worker, canvas, () => true);
    const expected = ["Example Company", "Middle Company LTD", "Next Company Ltd", "Old Company Ltd.", "First Company Ltd"];
    const titles = ["Full Stack Developer", "Full Stack Developer", "Full Stack Developer", "1C Software Developer", "IT Specialist"];
    const pass = result?.roles.length === 5 && result.roles.every((role, index) => role.company === expected[index] && role.title === titles[index]);
    output.textContent = (pass ? "PASS" : "FAIL") + "\n" + JSON.stringify(result, null, 2);
  } catch (failure) { output.textContent = "FAIL " + String(failure); }
  finally { await worker.terminate(); }
};
