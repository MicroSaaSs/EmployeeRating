/** Local-only pixel regression. The page supplies temporary image/expected data, never bundled into the app. */
import { createTabOcrWorker, recognizeLinkedInView } from "../src/utils/tabOcr";
import { mergeCapturedRoles, type CapturedRole } from "../src/utils/linkedinTabCapture";
const output = document.querySelector<HTMLPreElement>("#output")!;
const config = JSON.parse(document.querySelector("#config")!.textContent!) as {
  image: string; images?: string[]; crop?: { x: number; y: number; width: number; height: number }; expected: CapturedRole[]; frames: number[]; frameHeight: number;
};
async function run(scroll: boolean) {
  const image = new Image(); image.src = config.image; await image.decode();
  const canvas = document.querySelector<HTMLCanvasElement>("#fixture")!;
  const worker = await createTabOcrWorker(value => { output.textContent = value; });
  let roles: CapturedRole[] = []; let group = "";
  const results: unknown[] = [];
  try {
    const views = config.images ?? (scroll ? config.frames : [0]);
    for (const top of views) {
      if (typeof top === "string") { image.src = top; await image.decode(); }
      const crop = config.crop;
      const height = crop?.height ?? (scroll ? Math.min(config.frameHeight, image.height - Number(top)) : image.height);
      const width = crop?.width ?? image.width;
      canvas.width = width * 2; canvas.height = height * 2;
      canvas.getContext("2d")!.drawImage(image, crop?.x ?? 0, crop?.y ?? Number(top), width, height, 0, 0, canvas.width, canvas.height);
      const result = await recognizeLinkedInView(worker, canvas, () => true, group);
      if (result) { roles = mergeCapturedRoles(roles, result.roles); group = result.group; results.push({ top, ...result }); }
    }
    const pass = roles.length === config.expected.length && config.expected.every(expected => roles.some(role =>
      ["company", "title", "start", "end"].every(key => role[key as keyof CapturedRole] === expected[key as keyof CapturedRole])));
    output.textContent = (pass ? "PASS" : "FAIL") + "\n" + JSON.stringify({ roles, results }, null, 2);
    const summary = document.querySelector("#summary");
    if (summary) {
      const heading = document.createElement("h2"); heading.textContent = (pass ? "PASS" : "Needs review") + " — " + roles.length + " unique roles";
      const table = document.createElement("table");
      const header = table.insertRow();
      for (const label of ["Job title", "Company", "Dates"]) { const cell = document.createElement("th"); cell.textContent = label; header.append(cell); }
      for (const role of roles) {
        const row = table.insertRow();
        for (const value of [role.title || "Needs review", role.company || "Needs review", role.start + " to " + role.end]) row.insertCell().textContent = value;
      }
      summary.replaceChildren(heading, table);
      document.querySelector("#trace")?.removeAttribute("open");
    }
  } catch (failure) { output.textContent = "FAIL " + String(failure); }
  finally { await worker.terminate(); }
}
document.querySelector<HTMLButtonElement>("#full")!.onclick = () => void run(false);
document.querySelector<HTMLButtonElement>("#scroll")!.onclick = () => void run(true);
