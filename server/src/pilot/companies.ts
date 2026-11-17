import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type { Database } from "../database/database";

export function cleanCompany(value: string) {
  return value.trim().normalize("NFC").replace(/\s+/g, " ");
}

export async function searchCompanies(db: Database, term: string, page: number) {
  const pageSize = 25;
  const { rows } = await db.pool.query<{ id: string; name: string; aliases: string[] }>(
    `SELECT c.id, c.name, ARRAY(
       SELECT coalesce(old.name, a.name_key) FROM company_aliases a
       LEFT JOIN companies old ON old.name_key = a.name_key
       WHERE a.company_id = c.id ORDER BY a.name_key
     ) AS aliases
     FROM companies c
     WHERE NOT EXISTS (SELECT 1 FROM company_aliases a WHERE a.name_key = c.name_key)
       AND (strpos(c.name_key, $1) > 0 OR EXISTS (
         SELECT 1 FROM company_aliases a WHERE a.company_id = c.id AND strpos(a.name_key, $1) > 0
       ))
     ORDER BY c.name_key, c.id LIMIT $2 OFFSET $3`,
    [cleanCompany(term).toLowerCase(), pageSize + 1, (page - 1) * pageSize],
  );
  return { companies: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

async function resolveCompanyLink(client: Pool | PoolClient, canonical: string, alias: string) {
  const canonicalKey = cleanCompany(canonical).toLowerCase();
  const aliasKey = cleanCompany(alias).toLowerCase();
  if (!canonicalKey || !aliasKey || canonicalKey === aliasKey) {
    throw new BadRequestException("Provide two distinct company names.");
  }
  const { rows: [link] } = await client.query<{
    canonicalId: string; canonicalName: string; aliasName: string | null;
    oldCompanyId: string | null; linkedCompanyId: string | null; affectedEntries: number;
  }>(
    `SELECT c.id AS "canonicalId", c.name AS "canonicalName", old.name AS "aliasName",
       old.id AS "oldCompanyId", a.company_id AS "linkedCompanyId",
       (SELECT count(*)::integer FROM work_history w WHERE w.company_id = old.id) AS "affectedEntries"
     FROM companies c
     LEFT JOIN companies old ON old.name_key = $2
     LEFT JOIN company_aliases a ON a.name_key = $2
     WHERE c.name_key = $1 AND NOT EXISTS (SELECT 1 FROM company_aliases WHERE name_key = $1)`,
    [canonicalKey, aliasKey],
  );
  if (!link) throw new NotFoundException("The canonical name must already exist in work history.");
  if (link.linkedCompanyId && link.linkedCompanyId !== link.canonicalId) {
    throw new ConflictException("That alias is already linked to a different company.");
  }
  return { ...link, aliasKey, aliasName: link.aliasName ?? cleanCompany(alias) };
}

export async function previewCompanyLink(db: Database, canonical: string, alias: string) {
  const link = await resolveCompanyLink(db.pool, canonical, alias);
  return {
    canonical: link.canonicalName, alias: link.aliasName,
    affectedEntries: link.affectedEntries, alreadyLinked: link.linkedCompanyId === link.canonicalId,
  };
}

// The operator changes aliases exclusively. Rating and work writes hold the shared lock.
export async function linkCompanyName(db: Database, canonical: string, alias: string) {
  return db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(114010, 2)");
    const { aliasKey, canonicalId, oldCompanyId, linkedCompanyId } = await resolveCompanyLink(client, canonical, alias);
    if (linkedCompanyId === canonicalId) return { affectedEntries: 0, alreadyLinked: true };
    await client.query("INSERT INTO company_aliases (name_key, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [aliasKey, canonicalId]);
    if (!oldCompanyId) return { affectedEntries: 0, alreadyLinked: false };
    const updated = await client.query("UPDATE work_history SET company_id = $1 WHERE company_id = $2", [canonicalId, oldCompanyId]);
    await client.query("UPDATE company_aliases SET company_id = $1 WHERE company_id = $2", [canonicalId, oldCompanyId]);
    return { affectedEntries: updated.rowCount ?? 0, alreadyLinked: false };
  });
}
