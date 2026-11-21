import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const client = fileURLToPath(new URL("../", import.meta.url));
const assets = resolve(client, "public/ocr");
await rm(assets, { recursive: true, force: true });
await mkdir(resolve(assets, "core"), { recursive: true });
await mkdir(resolve(assets, "lang"), { recursive: true });
await copyFile(resolve(client, "node_modules/tesseract.js/dist/worker.min.js"), resolve(assets, "worker.min.js"));
for (const name of await readdir(resolve(client, "node_modules/tesseract.js-core"))) {
  if (/^tesseract-core.*\.wasm(?:\.js)?$/.test(name)) {
    await copyFile(resolve(client, "node_modules/tesseract.js-core", name), resolve(assets, "core", name));
  }
}
for (const language of ["eng", "rus"]) {
  await copyFile(resolve(client, "node_modules/@tesseract.js-data", language, "4.0.0_best_int", language + ".traineddata.gz"),
    resolve(assets, "lang", language + ".traineddata.gz"));
}
const version = JSON.parse(await readFile(resolve(client, "node_modules/tesseract.js/package.json"), "utf8")).version;
await copyFile(resolve(client, "node_modules/tesseract.js/LICENSE.md"), resolve(assets, "TESSERACT-LICENSE.md"));
await copyFile(resolve(client, "node_modules/tesseract.js-core/LICENSE"), resolve(assets, "CORE-LICENSE"));
console.log("Prepared first-party OCR assets for Tesseract " + version);
