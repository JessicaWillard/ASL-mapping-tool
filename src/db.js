import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const IDB_NAME = "asl-content-mapper";
const IDB_STORE = "db";
const IDB_KEY = "asl-mapping-db";
const LEGACY_STORAGE_KEY = "asl-mapping-v1";

let SQL = null;
let db = null;

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function loadDbBytes() {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const get = tx.objectStore(IDB_STORE).get(IDB_KEY);
    get.onsuccess = () => resolve(get.result ?? null);
    get.onerror = () => reject(get.error);
  });
}

async function persistDbBytes(bytes) {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      header TEXT,
      header_notes TEXT DEFAULT '',
      sort_order INTEGER NOT NULL
    );
  `);
  // Migration: add header_notes to existing databases that predate this column
  try { db.run("ALTER TABLE pages ADD COLUMN header_notes TEXT DEFAULT ''"); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS page_modules (
      page_id TEXT NOT NULL,
      module_id INTEGER NOT NULL,
      source TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (page_id, module_id),
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
  `);
}

function rowsToPages() {
  const pages = [];

  const pageStmt = db.prepare(
    "SELECT id, name, url, notes, status, header, header_notes FROM pages ORDER BY sort_order"
  );
  while (pageStmt.step()) {
    const row = pageStmt.getAsObject();
    pages.push({
      id: row.id,
      name: row.name,
      url: row.url || "",
      notes: row.notes || "",
      status: row.status || "draft",
      header: row.header || undefined,
      headerNotes: row.header_notes || "",
      modules: [],
    });
  }
  pageStmt.free();

  const modStmt = db.prepare(
    "SELECT page_id, module_id, source, notes FROM page_modules ORDER BY sort_order"
  );
  while (modStmt.step()) {
    const row = modStmt.getAsObject();
    const page = pages.find((p) => p.id === row.page_id);
    if (page) {
      page.modules.push({
        moduleId: row.module_id,
        source: row.source || "",
        notes: row.notes || "",
      });
    }
  }
  modStmt.free();

  return pages;
}

function writePages(pages) {
  db.run("BEGIN");
  try {
    db.run("DELETE FROM page_modules");
    db.run("DELETE FROM pages");

    const insertPage = db.prepare(
      "INSERT INTO pages (id, name, url, notes, status, header, header_notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertModule = db.prepare(
      "INSERT INTO page_modules (page_id, module_id, source, notes, sort_order) VALUES (?, ?, ?, ?, ?)"
    );

    pages.forEach((page, pageIndex) => {
      insertPage.run([
        page.id,
        page.name,
        page.url || "",
        page.notes || "",
        page.status || "draft",
        page.header || null,
        page.headerNotes || "",
        pageIndex,
      ]);
      page.modules.forEach((mod, modIndex) => {
        insertModule.run([
          page.id,
          mod.moduleId,
          mod.source || "",
          mod.notes || "",
          modIndex,
        ]);
      });
    });

    insertPage.free();
    insertModule.free();
    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
}

async function persistDb() {
  const bytes = db.export();
  await persistDbBytes(bytes);
}

async function loadLegacyLocalStorage() {
  try {
    const r = await window.storage?.get(LEGACY_STORAGE_KEY);
    if (!r?.value) return null;
    const parsed = JSON.parse(r.value);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function initDatabase(defaultPages) {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => wasmUrl });
  }

  const existing = await loadDbBytes();
  if (existing) {
    db = new SQL.Database(new Uint8Array(existing));
    createSchema();
    const pages = rowsToPages();
    if (pages.length > 0) return pages;
  }

  db = new SQL.Database();
  createSchema();

  const legacy = await loadLegacyLocalStorage();
  const pages = legacy ?? defaultPages;
  writePages(pages);
  await persistDb();
  return pages;
}

export async function savePages(pages) {
  if (!db) throw new Error("Database not initialized");
  writePages(pages);
  await persistDb();
}
