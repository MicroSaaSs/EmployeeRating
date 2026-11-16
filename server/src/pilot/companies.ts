import type { Database } from "../database/database";

export function cleanCompany(value: string) {
  return value.trim().normalize("NFC").replace(/\s+/g, " ");
}

// The operator changes aliases exclusively. Rating and work writes hold the shared lock.
export async function linkCompanyName(db: Database, canonical: string, alias: string) {
  const canonicalKey = cleanCompany(canonical).toLowerCase();
  const aliasKey = cleanCompany(alias).toLowerCase();
  if (!canonicalKey || !aliasKey || canonicalKey === aliasKey) throw new Error("Provide two distinct company names.");

  await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(114010, 2)");
    const company = await client.query<{ id: string }>(
      `SELECT id FROM companies WHERE name_key = $1
       AND NOT EXISTS (SELECT 1 FROM company_aliases WHERE name_key = $1)`, [canonicalKey],
    );
    const canonicalId = company.rows[0]?.id;
    if (!canonicalId) throw new Error("The canonical name must already exist in work history.");
    const existing = await client.query<{ company_id: string }>(
      "SELECT company_id FROM company_aliases WHERE name_key = $1", [aliasKey],
    );
    if (existing.rows[0] && existing.rows[0].company_id !== canonicalId) {
      throw new Error("That alias is already linked to a different company.");
    }

    await client.query("INSERT INTO company_aliases (name_key, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [aliasKey, canonicalId]);
    const oldCompany = await client.query<{ id: string }>("SELECT id FROM companies WHERE name_key = $1", [aliasKey]);
    if (oldCompany.rows[0]) {
      await client.query("UPDATE work_history SET company_id = $1 WHERE company_id = $2", [canonicalId, oldCompany.rows[0].id]);
      await client.query("UPDATE company_aliases SET company_id = $1 WHERE company_id = $2", [canonicalId, oldCompany.rows[0].id]);
    }
  });
}
