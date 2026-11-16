import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Database } from "./database";

export async function migrate(db: Database) {
  const folder = join(__dirname, "../../migrations");
  const files = (await readdir(folder)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();

  await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(114010, 1)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)");
    const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map(({ name }) => name));
    for (const name of files) {
      if (applied.has(name)) continue;
      await client.query(await readFile(join(folder, name), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    }
  });
}
