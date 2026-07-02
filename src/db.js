// db.js — replaced sql.js/IndexedDB with shared Neon backend via /api/pages

const API_URL = "/api/pages";

// Shape raw API rows into the page objects the UI expects
function buildPages(rawPages, rawModules) {
  const pages = rawPages.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url || "",
    notes: row.notes || "",
    status: row.status || "draft",
    header: row.header || undefined,
    headerNotes: row.header_notes || "",
    modules: [],
  }));

  for (const row of rawModules) {
    const page = pages.find((p) => p.id === row.page_id);
    if (page) {
      page.modules.push({
        instanceId: row.instance_id,
        moduleId: row.module_id,
        source: row.source || "",
        notes: row.notes || "",
      });
    }
  }

  return pages;
}

// Flatten page objects back into rows for the API
function flattenPages(pages) {
  const rawPages = pages.map((p, i) => ({
    id: p.id,
    name: p.name,
    url: p.url ?? "",
    notes: p.notes ?? "",
    status: p.status ?? "draft",
    header: p.header ?? null,
    header_notes: p.headerNotes ?? "",
    sort_order: i,
  }));

  const rawModules = [];
  for (const p of pages) {
    (p.modules || []).forEach((m, i) => {
      rawModules.push({
        instance_id: m.instanceId,
        page_id: p.id,
        module_id: m.moduleId,
        source: m.source ?? "",
        notes: m.notes ?? "",
        sort_order: i,
      });
    });
  }

  return { pages: rawPages, modules: rawModules };
}

// Load all pages from the shared Neon database
export async function initDatabase() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Failed to load pages: ${res.statusText}`);
  const { pages, modules } = await res.json();
  return buildPages(pages, modules);
}

// Save all pages to the shared Neon database
export async function savePages(pages) {
  const body = flattenPages(pages);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to save pages: ${res.statusText}`);
}
