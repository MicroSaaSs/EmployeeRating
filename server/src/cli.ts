import { Database } from "./database/database";
import { migrate } from "./database/migrate";
import { linkCompanyName } from "./pilot/companies";
import { PilotOperationsService } from "./pilot/operations.service";

async function run() {
  const [action, value, secondValue] = process.argv.slice(2);
  const db = new Database();
  const operations = new PilotOperationsService(db);
  try {
    if (action === "migrate") {
      await migrate(db);
      console.log("Migrations applied.");
    } else if (action === "invite" && (!value || value === "--operator")) {
      const invite = await operations.issueInvite(value ? "operator" : "participant", "operator-cli");
      console.log(invite.url);
    } else if (action === "remove-account" && value && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
      const removed = await db.pool.query("DELETE FROM users WHERE id = $1", [value]);
      console.log(removed.rowCount ? "Account and associated data removed." : "Account not found.");
    } else if (action === "link-company-name" && value && secondValue) {
      await linkCompanyName(db, value, secondValue);
      console.log("Company names linked.");
    } else if (action === "metrics") {
      console.log(JSON.stringify(await operations.metrics(), null, 2));
    } else if (action === "prune") {
      await db.transaction(async (client) => {
        await client.query("DELETE FROM sessions WHERE expires_at <= now()");
        await client.query("DELETE FROM oauth_attempts WHERE expires_at <= now()");
        await client.query("DELETE FROM invites WHERE expires_at <= now()");
        await client.query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
      });
      console.log("Expired authentication and rate-limit records removed.");
    } else {
      throw new Error("Usage: migrate | invite [--operator] | remove-account <user-id> | link-company-name <canonical-name> <alias> | metrics | prune");
    }
  } finally {
    await db.onApplicationShutdown();
  }
}

run().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
