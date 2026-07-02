import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  // GET /api/pages — load all pages and modules
  if (req.method === "GET") {
    const pages = await sql`
      SELECT id, name, url, notes, status, header, header_notes, sort_order
      FROM pages
      ORDER BY sort_order
    `;
    const modules = await sql`
      SELECT instance_id, page_id, module_id, source, notes, sort_order
      FROM page_modules
      ORDER BY sort_order
    `;
    return res.status(200).json({ pages, modules });
  }

  // POST /api/pages — save all pages and modules (full replace)
  if (req.method === "POST") {
    const { pages = [], modules = [] } = req.body;

    // Delete all existing data (mirrors your current SQLite savePages behavior)
    await sql`DELETE FROM page_modules`;
    await sql`DELETE FROM pages`;

    // Re-insert pages
    for (const p of pages) {
      await sql`
        INSERT INTO pages (id, name, url, notes, status, header, header_notes, sort_order)
        VALUES (
          ${p.id},
          ${p.name},
          ${p.url ?? ""},
          ${p.notes ?? ""},
          ${p.status ?? "draft"},
          ${p.header ?? null},
          ${p.header_notes ?? ""},
          ${p.sort_order}
        )
      `;
    }

    // Re-insert modules
    for (const m of modules) {
      await sql`
        INSERT INTO page_modules (instance_id, page_id, module_id, source, notes, sort_order)
        VALUES (
          ${m.instance_id},
          ${m.page_id},
          ${m.module_id},
          ${m.source ?? ""},
          ${m.notes ?? ""},
          ${m.sort_order}
        )
      `;
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
