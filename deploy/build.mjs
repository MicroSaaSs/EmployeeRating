import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const role = process.env.EPRORATE_HEROKU_ROLE;
if (role !== "client" && role !== "api") {
  throw new Error("EPRORATE_HEROKU_ROLE must be client or api");
}

const directory = role === "client" ? "client" : "server";
function npm(...args) {
  const result = spawnSync("npm", [...args, "--prefix", directory], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

npm("ci", "--include=dev");
npm("run", "build");
if (role === "api") {
  npm("prune", "--omit=dev");
} else {
  rmSync("client/node_modules", { recursive: true, force: true });
}
