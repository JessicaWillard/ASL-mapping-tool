import { useState, useEffect, useRef } from "react";
import { initDatabase, savePages } from "./db.js";
import { rowsToCsv, downloadCsv } from "./csv.js";
import { getModuleThumbnail, getHeaderThumbnail } from "./thumbnails.js";
import ThumbnailField from "./ThumbnailField.jsx";
import ExternalLink from "./ExternalLink.jsx";
import {
  MODULES,
  HEADERS,
  CAT_COLORS,
  PAGE_STATUS,
  DEFAULT_PAGES,
} from "./constants.js";

const BASE_URL = "https://aslouis.qc.ca";

function sourceHref(source) {
  if (!source) return null;
  return source.startsWith("http") ? source : `${BASE_URL}${source}`;
}

export default function ContentMapper() {
  const [activeTab, setActiveTab] = useState("modules");
  const [searchMod, setSearchMod] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [pages, setPages] = useState([]);
  const [expandedPage, setExpandedPage] = useState(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPage, setNewPage] = useState({ name: "", url: "", notes: "" });
  const [showModulePicker, setShowModulePicker] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const saveTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await initDatabase(DEFAULT_PAGES);
        setPages(data);
      } catch (e) {
        console.error("Failed to load database:", e);
        setPages(DEFAULT_PAGES);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await savePages(pages);
        setSaveState("saved");
      } catch (e) {
        console.error("Failed to save database:", e);
        setSaveState("error");
      }
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [pages, loaded]);

  const [moduleView, setModuleView] = useState("modules"); // "modules" | "headers"

  const filteredModules = MODULES.filter(
    (m) =>
      (catFilter === "all" || m.cat === catFilter) &&
      (m.name.toLowerCase().includes(searchMod.toLowerCase()) ||
        m.desc.toLowerCase().includes(searchMod.toLowerCase())),
  );

  const filteredHeaders = HEADERS.filter(
    (h) =>
      h.name.toLowerCase().includes(searchMod.toLowerCase()) ||
      h.desc.toLowerCase().includes(searchMod.toLowerCase()),
  );

  const addPage = () => {
    if (!newPage.name.trim()) return;
    const p = {
      id: Date.now().toString(),
      name: newPage.name.trim(),
      url: newPage.url.trim(),
      notes: newPage.notes.trim(),
      status: "draft",
      modules: [],
    };
    setPages((prev) => [...prev, p]);
    setNewPage({ name: "", url: "", notes: "" });
    setShowAddPage(false);
    setExpandedPage(p.id);
  };

  const removePage = (id) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (expandedPage === id) setExpandedPage(null);
  };
  const updatePage = (id, field, value) =>
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );

  const addModule = (pageId, moduleId) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          modules: [...p.modules, { instanceId: `${pageId}_${moduleId}_${Date.now()}`, moduleId, source: "", notes: "" }],
        };
      }),
    );
    setShowModulePicker(null);
  };

  const updateModule = (pageId, instanceId, field, value) =>
    setPages((prev) =>
      prev.map((p) =>
        p.id !== pageId
          ? p
          : {
              ...p,
              modules: p.modules.map((m) =>
                m.instanceId !== instanceId ? m : { ...m, [field]: value },
              ),
            },
      ),
    );

  const removeModule = (pageId, instanceId) =>
    setPages((prev) =>
      prev.map((p) =>
        p.id !== pageId
          ? p
          : { ...p, modules: p.modules.filter((m) => m.instanceId !== instanceId) },
      ),
    );

  const reorderPages = (fromIndex, toIndex) => {
    setPages((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  const moveModule = (pageId, instanceId, dir) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== pageId) return p;
        const mods = [...p.modules];
        const idx = mods.findIndex((m) => m.instanceId === instanceId);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= mods.length) return p;
        [mods[idx], mods[newIdx]] = [mods[newIdx], mods[idx]];
        return { ...p, modules: mods };
      }),
    );
  };

  const totalAssignments = pages.reduce((s, p) => s + p.modules.length, 0);

  const buildCsvRows = () => {
    const rows = [
      [
        "Page",
        "URL",
        "Statut page",
        "En-tête",
        "Notes en-tête",
        "M#",
        "Module",
        "Notes module",
        "URL source / existante",
        "Notes page",
      ],
    ];
    pages.forEach((page) => {
      const headerLabel = page.header
        ? `${page.header} — ${HEADERS.find((h) => h.id === page.header)?.name || ""}`
        : "";
      if (!page.modules.length) {
        rows.push([
          page.name,
          page.url,
          PAGE_STATUS[page.status]?.label || "",
          headerLabel,
          page.headerNotes || "",
          "",
          "",
          "",
          "",
          page.notes,
        ]);
      } else {
        page.modules.forEach((ma, i) => {
          const mod = MODULES.find((m) => m.id === ma.moduleId);
          rows.push([
            i === 0 ? page.name : "",
            i === 0 ? page.url : "",
            i === 0 ? PAGE_STATUS[page.status]?.label || "" : "",
            i === 0 ? headerLabel : "",
            i === 0 ? page.headerNotes || "" : "",
            mod?.id ?? "",
            mod?.name || "",
            ma.notes,
            ma.source,
            i === 0 ? page.notes : "",
          ]);
        });
      }
    });
    return rows;
  };

  const exportCSV = () => {
    downloadCsv(rowsToCsv(buildCsvRows()));
  };

  const cats = ["all", ...Object.keys(CAT_COLORS)];

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#f7f7f7",
        minHeight: "100vh",
        color: "#1a1a1a",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          background: "#0f1628",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              background: "#2f79ff",
              borderRadius: 8,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            A
          </div>
          <div>
            <div
              style={{
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.2,
              }}
            >
              Académie Saint-Louis — Refonte
            </div>
            <div style={{ color: "#5a6a8a", fontSize: 11 }}>
              mapping contenu → modules
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["modules", "Modules"],
            ["mapping", " Mapping"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: activeTab === id ? "#2f79ff" : "transparent",
                color: activeTab === id ? "white" : "#f5f5f5",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MODULES TAB ── */}
      {activeTab === "modules" && (
        <div style={{ padding: 24 }}>
          {/* Modules / Headers toggle */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 20,
              background: "white",
              borderRadius: 10,
              padding: 5,
              width: "fit-content",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
          >
            {[
              ["modules", "Modules"],
              ["headers", "En-têtes"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => {
                  setModuleView(v);
                  setSearchMod("");
                  setCatFilter("all");
                }}
                style={{
                  padding: "7px 16px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  background: moduleView === v ? "#0f1628" : "transparent",
                  color: moduleView === v ? "white" : "#64748b",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder={
                moduleView === "modules"
                  ? "Rechercher un module…"
                  : "Rechercher un en-tête…"
              }
              value={searchMod}
              onChange={(e) => setSearchMod(e.target.value)}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
                flex: "1 1 220px",
                outline: "none",
              }}
            />
            {moduleView === "modules" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {cats.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    style={{
                      padding: "7px 13px",
                      borderRadius: 20,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background:
                        catFilter === cat
                          ? CAT_COLORS[cat] || "#2f79ff"
                          : "white",
                      color: catFilter === cat ? "white" : "#64748b",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    {cat === "all" ? "Tous" : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content modules grid */}
          {moduleView === "modules" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 14,
              }}
            >
              {filteredModules.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    borderLeft: `4px solid ${CAT_COLORS[mod.cat]}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        background: CAT_COLORS[mod.cat],
                        color: "white",
                        borderRadius: 20,
                        padding: "3px 11px",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      M{mod.id}
                    </div>
                    <div
                      style={{
                        background: CAT_COLORS[mod.cat] + "18",
                        color: CAT_COLORS[mod.cat],
                        borderRadius: 12,
                        padding: "3px 9px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {mod.cat}
                    </div>
                  </div>
                  <ThumbnailField
                    value={getModuleThumbnail(mod.id)}
                    accentColor={CAT_COLORS[mod.cat]}
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 7,
                      lineHeight: 1.3,
                    }}
                  >
                    {mod.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 1.55,
                      marginBottom: mod.link ? 0 : 12,
                    }}
                  >
                    {mod.desc}
                  </div>
                  <ExternalLink
                    href={mod.link}
                    label={mod.linkLabel}
                    color={CAT_COLORS[mod.cat]}
                  />
                  <div
                    style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#94a3b8",
                        letterSpacing: 1,
                        marginBottom: 6,
                      }}
                    >
                      CONTENU
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {mod.needs.map((n, i) => (
                        <span
                          key={i}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 4,
                            padding: "3px 8px",
                            fontSize: 11,
                            color: "#475569",
                          }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {filteredModules.length === 0 && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: 40,
                    color: "#94a3b8",
                  }}
                >
                  Aucun module trouvé pour « {searchMod} »
                </div>
              )}
            </div>
          )}

          {/* Headers grid */}
          {moduleView === "headers" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 14,
              }}
            >
              {filteredHeaders.map((h) => (
                <div
                  key={h.id}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    borderLeft: "4px solid #2f79ff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        background: "#2f79ff",
                        color: "white",
                        borderRadius: 20,
                        padding: "3px 11px",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {h.id}
                    </div>
                    <div
                      style={{
                        background: "#2f79ff18",
                        color: "#2f79ff",
                        borderRadius: 12,
                        padding: "3px 9px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      En-tête
                    </div>
                  </div>
                  <ThumbnailField
                    value={getHeaderThumbnail(h.id)}
                    accentColor="#2f79ff"
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 7,
                      lineHeight: 1.3,
                    }}
                  >
                    {h.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 1.55,
                      marginBottom: h.link ? 0 : 12,
                    }}
                  >
                    {h.desc}
                  </div>
                  <ExternalLink href={h.link} label={h.linkLabel} />
                  <div
                    style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#94a3b8",
                        letterSpacing: 1,
                        marginBottom: 6,
                      }}
                    >
                      CONTENU
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {h.needs.map((n, i) => (
                        <span
                          key={i}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 4,
                            padding: "3px 8px",
                            fontSize: 11,
                            color: "#475569",
                          }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {filteredHeaders.length === 0 && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: 40,
                    color: "#94a3b8",
                  }}
                >
                  Aucun en-tête trouvé pour « {searchMod} »
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MAPPING TAB ── */}
      {activeTab === "mapping" && (
        <div style={{ padding: 24 }}>
          {/* Stats bar */}
          {pages.length > 0 && (
            <div
              style={{
                background: "white",
                borderRadius: 10,
                padding: "12px 20px",
                marginBottom: 18,
                display: "flex",
                gap: 20,
                alignItems: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {pages.length} page{pages.length > 1 ? "s" : ""}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>·</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {totalAssignments} modules assignés
              </div>
              <div style={{ flex: 1 }} />
              <span
                style={{
                  fontSize: 12,
                  color: saveState === "error" ? "#dc2626" : "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {saveState === "saving" && "Enregistrement…"}
                {saveState === "saved" && "✓ Sauvegardé"}
                {saveState === "error" && "Erreur de sauvegarde"}
              </span>
              <button
                onClick={exportCSV}
                style={{
                  background: "#0f1628",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ↓ CSV
              </button>
            </div>
          )}

          {/* Add page */}
          {showAddPage ? (
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 20,
                marginBottom: 14,
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                Nouvelle page
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <label
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Nom *
                  </span>
                  <input
                    value={newPage.name}
                    onChange={(e) =>
                      setNewPage((p) => ({ ...p, name: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addPage()}
                    placeholder="ex: Vie parascolaire"
                    autoFocus
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </label>
                <label
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Slug / URL
                  </span>
                  <input
                    value={newPage.url}
                    onChange={(e) =>
                      setNewPage((p) => ({ ...p, url: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addPage()}
                    placeholder="ex: /vie-parascolaire"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </label>
              </div>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Notes (contexte, ancienne URL…)
                </span>
                <input
                  value={newPage.notes}
                  onChange={(e) =>
                    setNewPage((p) => ({ ...p, notes: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addPage()}
                  placeholder="ex: Fusion des pages primaire + secondaire"
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={addPage}
                  style={{
                    background: "#2f79ff",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Ajouter
                </button>
                <button
                  onClick={() => setShowAddPage(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#64748b",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 18px",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddPage(true)}
              style={{
                background: "white",
                border: "2px dashed #cbd5e1",
                borderRadius: 12,
                padding: "13px 20px",
                fontSize: 14,
                color: "#64748b",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                marginBottom: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Ajouter une
              page
            </button>
          )}

          {/* Empty state */}
          {pages.length === 0 && !showAddPage && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#94a3b8",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 14 }}>🗺️</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: "#64748b",
                }}
              >
                Aucune page encore
              </div>
              <div style={{ fontSize: 14, maxWidth: 380, margin: "0 auto" }}>
                Ajoutez les pages de la nouvelle arborescence pour commencer la
                mapping contenu → modules.
              </div>
            </div>
          )}

          {/* Page list */}
          <div>
            {pages.map((page, pageIndex) => {
              const isOpen = expandedPage === page.id;
              const pSt = PAGE_STATUS[page.status] || PAGE_STATUS.draft;
              const isDragging = dragIndex === pageIndex;
              const isDropTarget =
                dragOverIndex === pageIndex && dragIndex !== pageIndex;
              return (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => setDragIndex(pageIndex)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(pageIndex);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== pageIndex)
                      reorderPages(dragIndex, pageIndex);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    marginBottom: 10,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    opacity: isDragging ? 0.4 : 1,
                    outline: isDropTarget ? "2px solid #2f79ff" : "none",
                    outlineOffset: -2,
                    transition: "opacity 0.15s, outline 0.1s",
                  }}
                >
                  {/* Row header */}
                  <div
                    onClick={() => setExpandedPage(isOpen ? null : page.id)}
                    style={{
                      padding: "13px 18px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderLeft: "4px solid #2f79ff",
                      background: isOpen ? "#fafcff" : "white",
                    }}
                  >
                    <span
                      title="Glisser pour réorganiser"
                      style={{
                        cursor: "grab",
                        color: "#cbd5e1",
                        fontSize: 15,
                        flexShrink: 0,
                        userSelect: "none",
                        lineHeight: 1,
                      }}
                    >
                      ⠿
                    </span>
                    <input
                      value={page.name}
                      onChange={(e) =>
                        updatePage(page.id, "name", e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        flex: 1,
                        minWidth: 0,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        cursor: "text",
                        padding: 0,
                      }}
                    />
                    {page.url && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          background: "#f1f5f9",
                          padding: "2px 8px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {page.url}
                      </span>
                    )}
                    {page.header && (
                      <span
                        style={{
                          fontSize: 11,
                          background: "#2f79ff",
                          color: "white",
                          borderRadius: 12,
                          padding: "2px 9px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {page.header}
                      </span>
                    )}
                    <select
                      value={page.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        updatePage(page.id, "status", e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        background: pSt.bg,
                        color: pSt.color,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {Object.entries(PAGE_STATUS).map(([k, s]) => (
                        <option key={k} value={k}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Supprimer "${page.name}" ?`))
                          removePage(page.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#e2e8f0",
                        fontSize: 18,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Expanded body */}
                  {isOpen && (
                    <div
                      style={{
                        padding: "14px 18px 18px",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <input
                        value={page.notes || ""}
                        onChange={(e) =>
                          updatePage(page.id, "notes", e.target.value)
                        }
                        placeholder="Notes sur cette page…"
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 12,
                          padding: "8px 12px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          width: "100%",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />

                      {/* Header selector */}
                      <div style={{ marginBottom: 16 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#94a3b8",
                            letterSpacing: 1,
                            marginBottom: 8,
                          }}
                        >
                          EN-TÊTE
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginBottom: page.header ? 8 : 0,
                          }}
                        >
                          {HEADERS.map((h) => {
                            const isSelected = page.header === h.id;
                            const thumb = getHeaderThumbnail(h.id);
                            return (
                              <button
                                key={h.id}
                                onClick={() =>
                                  updatePage(
                                    page.id,
                                    "header",
                                    isSelected ? null : h.id,
                                  )
                                }
                                style={{
                                  padding: thumb
                                    ? "4px 12px 4px 4px"
                                    : "5px 12px",
                                  borderRadius: 20,
                                  border: isSelected
                                    ? "none"
                                    : "1px solid #e2e8f0",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: isSelected ? 800 : 600,
                                  background: isSelected ? "#2f79ff" : "white",
                                  color: isSelected ? "white" : "#64748b",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                {thumb && (
                                  <img
                                    src={thumb}
                                    alt=""
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      objectFit: "cover",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                {h.id} —{" "}
                                {h.name
                                  .replace("En-tête ", "")
                                  .replace("En-tête", "")}
                              </button>
                            );
                          })}
                        </div>
                        {page.header && (
                          <input
                            value={page.headerNotes || ""}
                            onChange={(e) =>
                              updatePage(page.id, "headerNotes", e.target.value)
                            }
                            placeholder="Notes sur cet en-tête…"
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                              fontSize: 12,
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                        )}
                      </div>

                      {/* Module assignments */}
                      {page.modules.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: "#94a3b8",
                              letterSpacing: 1,
                              marginBottom: 8,
                            }}
                          >
                            MODULES ASSIGNÉS
                          </div>
                          {page.modules.map((ma, idx) => {
                            const mod = MODULES.find(
                              (m) => m.id === ma.moduleId,
                            );
                            const href = sourceHref(ma.source);
                            return (
                              <div
                                key={ma.instanceId}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "7px 0",
                                  borderBottom: "1px solid #f8fafc",
                                  flexWrap: "wrap",
                                }}
                              >
                                {/* Reorder */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      moveModule(page.id, ma.instanceId, -1)
                                    }
                                    disabled={idx === 0}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: idx > 0 ? "pointer" : "default",
                                      color: idx > 0 ? "#94a3b8" : "#e2e8f0",
                                      fontSize: 10,
                                      padding: "0 2px",
                                      lineHeight: 1,
                                    }}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() =>
                                      moveModule(page.id, ma.instanceId, 1)
                                    }
                                    disabled={idx === page.modules.length - 1}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor:
                                        idx < page.modules.length - 1
                                          ? "pointer"
                                          : "default",
                                      color:
                                        idx < page.modules.length - 1
                                          ? "#94a3b8"
                                          : "#e2e8f0",
                                      fontSize: 10,
                                      padding: "0 2px",
                                      lineHeight: 1,
                                    }}
                                  >
                                    ▼
                                  </button>
                                </div>
                                {/* Badge */}
                                <div
                                  style={{
                                    background: CAT_COLORS[mod.cat],
                                    color: "white",
                                    borderRadius: 20,
                                    padding: "3px 10px",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  M{mod.id}
                                </div>
                                {/* Name */}
                                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      fontSize: 13,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {mod.name}
                                  </div>
                                </div>
                                {/* Notes */}
                                <textarea
                                  value={ma.notes}
                                  onChange={(e) =>
                                    updateModule(
                                      page.id,
                                      ma.instanceId,
                                      "notes",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Notes…"
                                  rows={3}
                                  style={{
                                    padding: "5px 9px",
                                    borderRadius: 8,
                                    border: "1px solid #e2e8f0",
                                    fontSize: 12,
                                    flex: "0 1 500px",
                                    minWidth: 0,
                                    resize: "vertical",
                                    fontFamily: "inherit",
                                  }}
                                ></textarea>
                                {/* Source */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    flex: "0 1 180px",
                                    minWidth: 0,
                                  }}
                                >
                                  <input
                                    value={ma.source}
                                    onChange={(e) =>
                                      updateModule(
                                        page.id,
                                        ma.instanceId,
                                        "source",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="URL source existante"
                                    style={{
                                      padding: "5px 9px",
                                      borderRadius: 8,
                                      border: "1px solid #e2e8f0",
                                      fontSize: 12,
                                      width: "100%",
                                      minWidth: 0,
                                    }}
                                  />
                                  {href && (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "#2f79ff",
                                        fontSize: 16,
                                        textDecoration: "none",
                                        flexShrink: 0,
                                        lineHeight: 1,
                                      }}
                                      title={href}
                                    >
                                      ↗
                                    </a>
                                  )}
                                </div>
                                {/* Remove */}
                                <button
                                  onClick={() =>
                                    removeModule(page.id, ma.instanceId)
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#e2e8f0",
                                    fontSize: 18,
                                    lineHeight: 1,
                                    padding: 0,
                                    flexShrink: 0,
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Module picker */}
                      {showModulePicker === page.id ? (
                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: 10,
                            padding: 14,
                            marginTop: 8,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 12,
                              marginBottom: 10,
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Sélectionner un module
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(240px, 1fr))",
                              gap: 7,
                              maxHeight: 280,
                              overflowY: "auto",
                            }}
                          >
                            {MODULES.map((mod) => {
                              const thumb = getModuleThumbnail(mod.id);
                              return (
                                <button
                                  key={mod.id}
                                  onClick={() => addModule(page.id, mod.id)}
                                  style={{
                                    background: "white",
                                    border: `1px solid ${CAT_COLORS[mod.cat]}30`,
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt=""
                                      style={{
                                        width: 36,
                                        height: 24,
                                        borderRadius: 4,
                                        objectFit: "cover",
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        background: CAT_COLORS[mod.cat],
                                        color: "white",
                                        borderRadius: 12,
                                        padding: "2px 8px",
                                        fontSize: 11,
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      M{mod.id}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {mod.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setShowModulePicker(null)}
                            style={{
                              marginTop: 10,
                              background: "#e2e8f0",
                              border: "none",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Fermer
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowModulePicker(page.id)}
                          style={{
                            background: "#f1f5f9",
                            border: "1px dashed #cbd5e1",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 13,
                            color: "#64748b",
                            cursor: "pointer",
                            fontWeight: 600,
                            marginTop: 4,
                          }}
                        >
                          + Assigner un module
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
