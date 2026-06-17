import { useState, useEffect, useRef } from "react";
import { initDatabase, savePages } from "./db.js";
import { rowsToCsv, downloadCsv } from "./csv.js";
import { getModuleThumbnail, getHeaderThumbnail } from "./thumbnails.js";
import ThumbnailField from "./ThumbnailField.jsx";
import ExternalLink from "./ExternalLink.jsx";

const MODULES = [
  { id: 1,  name: "Mosaïque d'images + texte",                     cat: "Média",      desc: "Grille d'images combinée à un bloc texte éditorial. Idéal pour introductions visuelles riches ou galeries contextuelles.",                        needs: ["Images (6-9)", "Titre", "Texte", "CTA optionnel"], link: "https://xd.adobe.com/view/01a61cf0-b9ec-4228-a251-933dbf0369d0-54f5/screen/4da79410-08d7-4c22-b87d-0a4146d0a744/specs/", linkLabel: "Maquette" },
  { id: 2,  name: "Statistiques + image",                          cat: "Stats",    desc: "Mise en valeur de chiffres clés avec image. Résultats, faits marquants, Stats institutionnelles.",                                               needs: ["2-4 stats (chiffre + libellé)", "Image"], link:"https://xd.adobe.com/view/01a61cf0-b9ec-4228-a251-933dbf0369d0-54f5/screen/995d46db-6b41-4a98-a539-8bfd2b993ca1/specs/", linkLabel: "Maquette" },
  { id: 3,  name: "2 cartes avec image et lien (2 colonnes)",      cat: "Navigation", desc: "Deux grandes cartes d'entrée avec image, titre et description. Navigation principale vers deux sous-sections majeures.",                           needs: ["2× Image", "2× Titre section", "2× Sous-titre", "2× Texte", "2× URL"] },
  { id: 4,  name: "Cartes image + texte + CTA (2 colonnes)",       cat: "Cartes",     desc: "Grille de cartes éditoriales avec image, texte et bouton d'action. Présenter plusieurs offres, services ou programmes.",                          needs: ["Image", "Titre", "Texte", "CTA (label + URL)"] },
  { id: 5,  name: "Cartes de navigation avec image",               cat: "Navigation", desc: "Navigation visuelle vers sous-pages. Idéal pour hubs de section avec entrées multiples.",                                                           needs: ["Image", "Titre", "URL"] },
  { id: 6,  name: "Actualité vedette + liste d'articles",          cat: "Actualités", desc: "Article mis en avant + liste d'articles secondaires. Pages actualités, blogue, événements.",                                                       needs: ["Article vedette (image, titre, extrait, date)", "3-5 articles liste"] },
  { id: 7,  name: "Texte + mosaïque d'images",                    cat: "Média",      desc: "Bloc éditorial textuel + mosaïque d'images. Présenter une activité, un programme, un lieu.",                                                       needs: ["Titre", "Texte long", "Images (3-6)"] },
  { id: 8,  name: "Navigation + image",                            cat: "Navigation", desc: "Liste de liens de navigation + image illustrative. Sous-menus, pages de section avec entrées secondaires.",                                         needs: ["Image", "Liens (titre + URL)"] },
  { id: 9,  name: "Image + texte + CTA",                           cat: "Contenu",    desc: "Disposition image-texte classique avec appel à l'action. Module polyvalent, utilisable pour quasi toutes les sections.",                           needs: ["Image", "Titre", "Texte", "CTA (label + URL)"] },
  { id: 10, name: "Grille de cartes informatives",                  cat: "Cartes",     desc: "Grille sans image, contenu textuel dense. Listes de services, avantages, critères, caractéristiques.",                                            needs: ["Icône ou numéro", "Titre", "Texte court"] },
  { id: 11, name: "Bannière d'appel à l'action",                   cat: "CTA",        desc: "Bannière pleine largeur avec titre accrocheur et bouton principal. Conversions, inscriptions, urgences.",                                          needs: ["Titre", "Sous-titre", "CTA principal", "CTA secondaire (opt.)"] },
  { id: 12, name: "Bandeau informatif",                             cat: "CTA",        desc: "Bandeau horizontal compact pour messages courts. Alertes, délais d'inscription, informations urgentes.",                                           needs: ["Texte court", "Lien (opt.)"] },
  { id: 13, name: "Navigation latérale + contenu",                  cat: "Navigation", desc: "Deux colonnes : navigation fixe à gauche + contenu à droite. Sections avec plusieurs sous-thèmes reliés.",                                         needs: ["Liens nav latérale", "Titre", "Contenu riche (texte, images)"] },
  { id: 14, name: "Accordéons + contenu",                          cat: "Contenu",    desc: "Sections dépliables. FAQ, informations détaillées, politiques, conditions, horaires détaillés.",                                                   needs: ["Titre section", "N× (Label + Contenu)"] },
  { id: 15, name: "Contenu vedette + liens",                        cat: "Cartes",     desc: "Contenu principal mis en avant avec liens associés. Pages de programme ou d'offre principale avec ressources.",                                    needs: ["Image ou média", "Titre", "Texte", "Liens associés (3-5)"] },
  { id: 16, name: "Carte de contenu + Image + Accordéon",           cat: "Contenu",    desc: "Combinaison carte texte + image + accordéon. Pages de programme complexes avec informations détaillées.",                                          needs: ["Titre", "Texte carte", "Image", "N× Accordéons"] },
  { id: 17, name: "Cartes de contenu (2 colonnes)",                 cat: "Cartes",     desc: "Cartes textuelles en 2 colonnes sans image. Ressources, documents, entrées de même niveau hiérarchique.",                                         needs: ["Icône (opt.)", "Titre", "Texte", "Lien"] },
  { id: 18, name: "Grille textuelle (3 colonnes)",                  cat: "Cartes",     desc: "Trois colonnes de contenu textuel structuré. Comparatifs, étapes, groupes de caractéristiques ou avantages.",                                     needs: ["3× (Titre + Texte)"] },
  { id: 19, name: "Grille équipes / partenaires (4 colonnes)",      cat: "Personnes",  desc: "Grille de profils ou logos en 4 colonnes. Équipes de direction, partenaires institutionnels, membres du conseil.",                                needs: ["Photo ou logo", "Nom", "Rôle ou description"] },
  { id: 20, name: "Bandeau réseaux sociaux",                        cat: "Social",     desc: "Intégration et mise en avant des réseaux sociaux. Flux Instagram, liens vers Facebook, YouTube.",                                                 needs: ["Titre", "Comptes sociaux (URLs)"] },
  { id: 21, name: "Carrousel de cartes image + texte + CTA",        cat: "Cartes",     desc: "Carrousel horizontal de cartes avec image, texte et bouton. Collections de sports, activités parascolaires, programmes.",                         needs: ["N× (Image, Titre, Texte, CTA)"] },
];

const HEADERS = [
  { id: "H1", name: "En-tête avec vidéo et carrousel",              desc: "Header riche avec vidéo en arrière-plan et carrousel d'images. Réservé à l'Accueil ou aux pages vitrines majeures.",                    needs: ["Vidéo (URL YouTube/Vimeo)", "Images carrousel (3-5)", "Titre", "Sous-titre", "CTA principal", "CTA secondaire (opt.)"] },
  { id: "H2", name: "En-tête sans image",                           desc: "Header minimaliste, texte seul. Pour pages utilitaires, légales ou de second niveau où l'image n'apporte pas de valeur.",             needs: ["Titre", "Fil d'Ariane", "Description courte (opt.)"] },
  { id: "H3", name: "En-tête avec image",                           desc: "Header standard avec image illustrative. Convient à la majorité des pages de section et de contenu.",                                  needs: ["Image", "Titre", "Description courte", "Fil d'Ariane"] },
  { id: "H4", name: "En-tête pleine largeur avec badge + image",    desc: "Header pleine largeur avec image intégrée et badge/étiquette. Pour pages de programme ou d'offre spécifique.",                        needs: ["Image pleine largeur", "Badge (ex: Études-sports)", "Titre", "Description"] },
  { id: "H5", name: "En-tête pour introduction globale",            desc: "Header de hub de section avec liens de navigation internes. Pour pages d'entrée qui orientent vers des sous-sections.",               needs: ["Titre section", "Texte d'introduction", "Liens sous-sections (3-6)"] },
  { id: "H6", name: "En-tête sans image avec CTA",                  desc: "Header orienté conversion, sans image. Titre accrocheur + appel à l'action direct. Portes ouvertes, Admission, Camps.",               needs: ["Titre", "Texte court", "CTA principal", "CTA secondaire (opt.)"] },
  { id: "H7", name: "En-tête avec image carrousel",                 desc: "Header avec défilement d'images. Pour pages riches en contenu visuel (sports, vie scolaire, vie à l'école).",                         needs: ["Images (3-5)", "Titre", "Description courte"] },
  { id: "H8", name: "En-tête centrée pleine largeur sans image",    desc: "Header sobre, titre centré pleine largeur, fond de couleur. Pour pages de présentation, politique, légal.",                           needs: ["Titre (centré)", "Description courte (opt.)", "Couleur de fond"] },
];

const CAT_COLORS = {
  "Navigation": "#6366f1", "Cartes": "#0ea5e9", "Contenu": "#10b981",
  "Média": "#8b5cf6",      "Stats": "#f59e0b", "Actualités": "#ef4444",
  "CTA": "#f97316",        "Personnes": "#ec4899", "Social": "#1d9bf0",
};

const STATUS = {
  ready:   { label: "Prêt",        color: "#059669", bg: "#d1fae5", emoji: "✅" },
  adapt:   { label: "À adapter",   color: "#d97706", bg: "#fef3c7", emoji: "⚠️" },
  missing: { label: "Manquant",    color: "#dc2626", bg: "#fee2e2", emoji: "❌" },
  new:     { label: "Nouveau",     color: "#7c3aed", bg: "#ede9fe", emoji: "🆕" },
};

const PAGE_STATUS = {
  draft:    { label: "Brouillon",   color: "#94a3b8", bg: "#f1f5f9" },
  progress: { label: "En cours",    color: "#d97706", bg: "#fef3c7" },
  review:   { label: "À valider",   color: "#7c3aed", bg: "#ede9fe" },
  done:     { label: "Complété",    color: "#059669", bg: "#d1fae5" },
};

const DEFAULT_PAGES = [
  // ── ACCUEIL
  { id:"p01", name:"Accueil", url:"/", notes:"Source : aslouis.qc.ca/ · Fusion des deux entrées primaire + secondaire", status:"draft", modules:[] },
  // ── NOTRE ÉCOLE
  { id:"p02", name:"Notre école — Présentation", url:"/notre-ecole/presentation", notes:"Source : /prescolaire-primaire/ecole/presentation/ + /secondaire/ecole/presentation/", status:"draft", modules:[] },
  { id:"p03", name:"Notre école — Notre vision", url:"/notre-ecole/vision", notes:"Source : /prescolaire-primaire/ecole/vision/ + /secondaire/ecole/vision/", status:"draft", modules:[] },
  { id:"p04", name:"Notre école — Pédagogie à l'ASL", url:"/notre-ecole/pedagogie", notes:"Nouveau · Regroupe plan engagement num. + progression num.", status:"draft", modules:[] },
  { id:"p05", name:"Notre école — Notre équipe", url:"/notre-ecole/equipe", notes:"Source : /prescolaire-primaire/ecole/notre-equipe/ + /secondaire/ecole/equipe/", status:"draft", modules:[] },
  { id:"p06", name:"Notre école — Nos pavillons", url:"/notre-ecole/pavillons", notes:"Nouveau · Iframe YouTube + visite virtuelle", status:"draft", modules:[] },
  { id:"p07", name:"Notre école — Partenaires", url:"/notre-ecole/partenaires", notes:"Contenu à identifier + logos", status:"draft", modules:[] },
  { id:"p08", name:"Notre école — Protecteur de l'élève", url:"/notre-ecole/protecteur-eleve", notes:"Source : /protection-de-leleve/", status:"draft", modules:[] },
  { id:"p09", name:"Notre école — 75e anniversaire", url:"/notre-ecole/75e-anniversaire", notes:"BROUILLON · À confirmer avec client", status:"draft", modules:[] },
  // ── PRÉSCOLAIRE · PRIMAIRE
  { id:"p10", name:"Préscolaire · Primaire — Hub", url:"/prescolaire-primaire", notes:"Source : /prescolaire-primaire/ · Nouvelle entrée unifiée", status:"draft", modules:[] },
  { id:"p11", name:"Préscolaire · Primaire — Notre offre", url:"/prescolaire-primaire/notre-offre", notes:"Nouveau · Explication globale de l'offre", status:"draft", modules:[] },
  { id:"p12", name:"Préscolaire · Primaire — Options sportives", url:"/prescolaire-primaire/nos-sports", notes:"Source : /prescolaire-primaire/nos-sports/ · Hub + 7 sports (Basketball, Cheerleading, Club de course, Football, Golf, Hockey, Soccer)", status:"draft", modules:[] },
  { id:"p13", name:"Préscolaire · Primaire — Soutien aux élèves", url:"/prescolaire-primaire/soutien-services", notes:"Nouveau", status:"draft", modules:[] },
  { id:"p14", name:"Préscolaire · Primaire — Vie scolaire", url:"/prescolaire-primaire/vie-scolaire", notes:"Source : /prescolaire-primaire/ecole/vie-scolaire/ · + Activités parascolaires, CréaZone, Service de garde, Comités, Événements, Reconnaissances, Implications", status:"draft", modules:[] },
  { id:"p15", name:"Plan engagement numérique", url:"/prescolaire-primaire/engagement-numerique", notes:"Nouveau · Multi-cycles (Préscolaire, 1er, 2e, 3e cycle)", status:"draft", modules:[] },
  // ── SECONDAIRE
  { id:"p16", name:"Secondaire — Hub", url:"/secondaire", notes:"Source : /secondaire/", status:"draft", modules:[] },
  { id:"p17", name:"Secondaire — Notre offre", url:"/secondaire/notre-offre", notes:"Nouveau", status:"draft", modules:[] },
  { id:"p18", name:"Secondaire — Études-sport | Basketball", url:"/secondaire/programmes/basketball", notes:"Source : /secondaire/nos-programmes/ (partiel)", status:"draft", modules:[] },
  { id:"p19", name:"Secondaire — Études-sport | Cheerleading", url:"/secondaire/programmes/cheerleading", notes:"Source : /secondaire/nos-programmes/ (partiel)", status:"draft", modules:[] },
  { id:"p20", name:"Secondaire — Études-sport | Football", url:"/secondaire/programmes/football", notes:"Source : /secondaire/nos-programmes/ (partiel)", status:"draft", modules:[] },
  { id:"p21", name:"Secondaire — Études-sport | Soccer", url:"/secondaire/programmes/soccer", notes:"Source : /secondaire/nos-programmes/ (partiel)", status:"draft", modules:[] },
  { id:"p22", name:"Secondaire — Programme traditionnel", url:"/secondaire/programmes/traditionnel", notes:"Nouveau · À distinguer des profils études-sports", status:"draft", modules:[] },
  { id:"p23", name:"Secondaire — Langues", url:"/secondaire/programmes/langues", notes:"Nouveau", status:"draft", modules:[] },
  { id:"p24", name:"Secondaire — Vie scolaire", url:"/secondaire/vie-scolaire", notes:"Source : /secondaire/ecole/vie-scolaire/ · + Classes collaboratives, Arts et spectacles, Voyages, Reconnaissances", status:"draft", modules:[] },
  { id:"p25", name:"Secondaire — Sports interscolaires", url:"/secondaire/sports-interscolaires", notes:"Source : /secondaire/nos-sports-interscolaires/ · + sous-pages par sport (Cross-Country, Flag-Football, Ultimate, Volleyball féminin)", status:"draft", modules:[] },
  { id:"p26", name:"Secondaire — Soutien aux élèves", url:"/secondaire/soutien-services", notes:"Nouveau", status:"draft", modules:[] },
  // ── SPORTS ET ACTIVITÉS
  { id:"p27", name:"Sports et Activités — Hub", url:"/sports-et-activites", notes:"Nouveau · Vue unifiée Prés./Prim. + Secondaire + Arsenal + Camps", status:"draft", modules:[] },
  { id:"p28", name:"L'Arsenal — Présentation", url:"/sports-et-activites/arsenal", notes:"NOUVELLE PAGE · Contenu entièrement nouveau à créer", status:"draft", modules:[] },
  { id:"p29", name:"Camps estivaux ASL et Arsenal", url:"/sports-et-activites/camps-estivaux", notes:"Source : /camps-estivaux-asl-et-arsenal-2026/ · + sous-pages par sport", status:"draft", modules:[] },
  { id:"p30", name:"Camps relâche — Mars", url:"/sports-et-activites/camps-relache-mars", notes:"Source : /camps-de-la-relache-arsenal-2-au-6-mars-2026/", status:"draft", modules:[] },
  { id:"p31", name:"Camps relâche — Novembre", url:"/sports-et-activites/camps-relache-novembre", notes:"Source : /camp-de-la-relache-automnale-17-au-21-novembre-2025/", status:"draft", modules:[] },
  { id:"p32", name:"Préparation physique — Football", url:"/sports-et-activites/preparation-physique-football", notes:"Source : /preparation-physique-ete-2026/ · Horaire type + Groupes et tarifs", status:"draft", modules:[] },
  // ── PORTES OUVERTES
  { id:"p33", name:"Portes ouvertes — Hub", url:"/portes-ouvertes", notes:"Nouveau · Entrée unifiée avec question de sélection de niveau", status:"draft", modules:[] },
  { id:"p34", name:"Portes ouvertes — Préscolaire · Primaire", url:"/portes-ouvertes/prescolaire-primaire", notes:"Source : /prescolaire-primaire/portes-ouvertes-2026/", status:"draft", modules:[] },
  { id:"p35", name:"Portes ouvertes — Secondaire", url:"/portes-ouvertes/secondaire", notes:"Source : /secondaire/portes-ouvertes-2026/", status:"draft", modules:[] },
  // ── ADMISSION
  { id:"p36", name:"Admission — Hub", url:"/admission", notes:"Nouveau · Entrée unifiée avec question obligatoire de sélection", status:"draft", modules:[] },
  { id:"p37", name:"Portail admission — Préscolaire", url:"/admission/prescolaire", notes:"Source : /prescolaire-primaire/portail-admission/admission-prescolaire/ · 6 étapes", status:"draft", modules:[] },
  { id:"p38", name:"Portail admission — Primaire", url:"/admission/primaire", notes:"Source : /prescolaire-primaire/portail-admission/primaire/ · 6 étapes", status:"draft", modules:[] },
  { id:"p39", name:"Portail admission — 1re secondaire", url:"/admission/1re-secondaire", notes:"Source : /secondaire/portail-admission/1re-secondaire/ · 4 étapes", status:"draft", modules:[] },
  { id:"p40", name:"Portail admission — 2e–5e secondaire", url:"/admission/2e-5e-secondaire", notes:"Source : /secondaire/portail-admission/2e-5e-secondaire/", status:"draft", modules:[] },
  { id:"p41", name:"Calculateur de frais", url:"/admission/calculateur-frais", notes:"Outil interactif · À confirmer si intégré ou redirection portail finances", status:"draft", modules:[] },
  // ── ESPACES PARENTS
  { id:"p42", name:"Espace parents — Hub", url:"/espace-parents", notes:"Source : fusion /prescolaire-primaire/espace-parents/ + /secondaire/espace-parents/", status:"draft", modules:[] },
  { id:"p43", name:"Espace parents — Préscolaire · Primaire", url:"/espace-parents/prescolaire-primaire", notes:"Source : /prescolaire-primaire/espace-parents/ · Calendrier, fin., technopéd., garde-robe, transport, matériel, cafétéria, boutique", status:"draft", modules:[] },
  { id:"p44", name:"Espace parents — Secondaire", url:"/espace-parents/secondaire", notes:"Source : /secondaire/espace-parents/ · Structure similaire", status:"draft", modules:[] },
  // ── FONDATION
  { id:"p45", name:"Fondation — Principale", url:"/fondation", notes:"Source : /secondaire/ecole/fondation-academie-saint-louis/ + /prescolaire-primaire/fondation-de-lacademie-saint-louis/", status:"draft", modules:[] },
  { id:"p46", name:"Fondation — Anciens · Anciennes", url:"/fondation/anciens-anciennes", notes:"Source : /secondaire/ecole/anciens-et-anciennes/", status:"draft", modules:[] },
  // ── CARRIÈRES
  { id:"p47", name:"Carrières — Postes disponibles", url:"/carrieres", notes:"Source : /carrieres/", status:"draft", modules:[] },
  { id:"p48", name:"Carrières — Banque de candidatures", url:"/carrieres/banque-candidatures", notes:"Nouveau", status:"draft", modules:[] },
  { id:"p49", name:"Suppléance — Primaire", url:"/carrieres/suppleance-primaire", notes:"Nouveau", status:"draft", modules:[] },
  { id:"p50", name:"Suppléance — Secondaire", url:"/carrieres/suppleance-secondaire", notes:"Nouveau", status:"draft", modules:[] },
  // ── ACTUALITÉS
  { id:"p51", name:"Actualités — Listing", url:"/nouvelles", notes:"Source : /nouvelles/ · Articles + événements regroupés", status:"draft", modules:[] },
  { id:"p52", name:"Actualités — EXTRA! (vedette)", url:"/nouvelles/extra", notes:"Nouvelle structure éditoriale · À confirmer", status:"draft", modules:[] },
  { id:"p53", name:"Actualités — Événements", url:"/nouvelles/evenements", notes:"Nouveau regroupement", status:"draft", modules:[] },
  // ── MENU BURGER / UTILITAIRES
  { id:"p54", name:"Location de salles", url:"/location-de-salles", notes:"Source : /location-de-salles/ · Salle polyvalente, Espace Convivio, Atrium, Gymnases, Terrain synthétique, etc.", status:"draft", modules:[] },
  { id:"p55", name:"Boutique en ligne", url:"/boutique", notes:"Source : /boutiques-en-ligne/ · 2nd Skin, Nike Team, Comité de parents", status:"draft", modules:[] },
  { id:"p56", name:"Campagne de financement", url:"/campagne-financement", notes:"BROUILLON · Structure à valider (Présentation, Images, État, Contribution, Plan de visibilité, Marchandises)", status:"draft", modules:[] },
  { id:"p57", name:"Nous joindre", url:"/nous-joindre", notes:"Source : /nous-joindre/ · Deux pavillons (Prés./Prim. + Secondaire)", status:"draft", modules:[] },
  // ── FOOTER / LÉGAL
  { id:"p58", name:"Nétiquette", url:"/netiquette", notes:"Source : /netiquette/", status:"draft", modules:[] },
  { id:"p59", name:"Politique de confidentialité", url:"/politique-de-confidentialite", notes:"Source : /politique-de-confidentialite/", status:"draft", modules:[] },
  { id:"p60", name:"Mention OSBL", url:"/mention-osbl", notes:"Nouveau", status:"draft", modules:[] },
];

export default function ContentMapper() {
  const [activeTab, setActiveTab] = useState("modules");
  const [searchMod, setSearchMod] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [pages, setPages] = useState([]);
  const [expandedPage, setExpandedPage] = useState(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPage, setNewPage] = useState({ name: "", url: "", notes: "" });
  const [showModulePicker, setShowModulePicker] = useState(null);
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

  const filteredModules = MODULES.filter(m =>
    (catFilter === "all" || m.cat === catFilter) &&
    (m.name.toLowerCase().includes(searchMod.toLowerCase()) || m.desc.toLowerCase().includes(searchMod.toLowerCase()))
  );

  const filteredHeaders = HEADERS.filter(h =>
    h.name.toLowerCase().includes(searchMod.toLowerCase()) || h.desc.toLowerCase().includes(searchMod.toLowerCase())
  );

  const addPage = () => {
    if (!newPage.name.trim()) return;
    const p = { id: Date.now().toString(), name: newPage.name.trim(), url: newPage.url.trim(), notes: newPage.notes.trim(), status: "draft", modules: [] };
    setPages(prev => [...prev, p]);
    setNewPage({ name: "", url: "", notes: "" });
    setShowAddPage(false);
    setExpandedPage(p.id);
  };

  const removePage = (id) => { setPages(prev => prev.filter(p => p.id !== id)); if (expandedPage === id) setExpandedPage(null); };
  const updatePage = (id, field, value) => setPages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const addModule = (pageId, moduleId) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId || p.modules.find(m => m.moduleId === moduleId)) return p;
      return { ...p, modules: [...p.modules, { moduleId, status: "missing", source: "", notes: "" }] };
    }));
    setShowModulePicker(null);
  };

  const updateModule = (pageId, moduleId, field, value) =>
    setPages(prev => prev.map(p => p.id !== pageId ? p : {
      ...p, modules: p.modules.map(m => m.moduleId !== moduleId ? m : { ...m, [field]: value })
    }));

  const removeModule = (pageId, moduleId) =>
    setPages(prev => prev.map(p => p.id !== pageId ? p : { ...p, modules: p.modules.filter(m => m.moduleId !== moduleId) }));

  const moveModule = (pageId, moduleId, dir) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      const mods = [...p.modules];
      const idx = mods.findIndex(m => m.moduleId === moduleId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= mods.length) return p;
      [mods[idx], mods[newIdx]] = [mods[newIdx], mods[idx]];
      return { ...p, modules: mods };
    }));
  };

  const totalAssignments = pages.reduce((s, p) => s + p.modules.length, 0);
  const statusCounts = Object.fromEntries(Object.keys(STATUS).map(k => [k, 0]));
  pages.forEach(p => p.modules.forEach(m => { if (statusCounts[m.status] !== undefined) statusCounts[m.status]++; }));

  const [csvModal, setCsvModal] = useState(null);

  const buildCsvRows = () => {
    const rows = [["Page", "URL", "Statut page", "En-tête", "M#", "Module", "Statut contenu", "URL source / existante", "Notes module", "Notes page"]];
    pages.forEach(page => {
      const headerLabel = page.header ? `${page.header} — ${HEADERS.find(h => h.id === page.header)?.name || ""}` : "";
      if (!page.modules.length) {
        rows.push([page.name, page.url, PAGE_STATUS[page.status]?.label || "", headerLabel, "", "", "", "", "", page.notes]);
      } else {
        page.modules.forEach((ma, i) => {
          const mod = MODULES.find(m => m.id === ma.moduleId);
          rows.push([
            i === 0 ? page.name : "", i === 0 ? page.url : "",
            i === 0 ? (PAGE_STATUS[page.status]?.label || "") : "",
            i === 0 ? headerLabel : "",
            mod?.id ?? "", mod?.name || "",
            `${STATUS[ma.status]?.emoji || ""} ${STATUS[ma.status]?.label || ""}`,
            ma.source, ma.notes, i === 0 ? page.notes : ""
          ]);
        });
      }
    });
    return rows;
  };

  const exportCSV = () => {
    const csv = rowsToCsv(buildCsvRows());
    setCsvModal(csv);
  };

  const cats = ["all", ...Object.keys(CAT_COLORS)];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f7f7f7", minHeight: "100vh", color: "#1a1a1a" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "#0f1628", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "#2f79ff", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 15 }}>A</div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Académie Saint-Louis — Refonte</div>
            <div style={{ color: "#5a6a8a", fontSize: 11 }}>mapping contenu → modules</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["modules", "📦 Modules (21)"], ["mapping", "🗺️ Mapping"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: activeTab === id ? "#2f79ff" : "transparent",
              color: activeTab === id ? "white" : "#5a6a8a",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── MODULES TAB ── */}
      {activeTab === "modules" && (
        <div style={{ padding: 24 }}>
          {/* Modules / Headers toggle */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "white", borderRadius: 10, padding: 5, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            {[["modules", "📦 Contenus (21)"], ["headers", "🏷️ En-têtes (8)"]].map(([v, label]) => (
              <button key={v} onClick={() => { setModuleView(v); setSearchMod(""); setCatFilter("all"); }} style={{
                padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: moduleView === v ? "#0f1628" : "transparent",
                color: moduleView === v ? "white" : "#64748b",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <input
              placeholder={moduleView === "modules" ? "Rechercher un module…" : "Rechercher un en-tête…"}
              value={searchMod} onChange={e => setSearchMod(e.target.value)}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, flex: "1 1 220px", outline: "none" }} />
            {moduleView === "modules" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {cats.map(cat => (
                  <button key={cat} onClick={() => setCatFilter(cat)} style={{
                    padding: "7px 13px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: catFilter === cat ? (CAT_COLORS[cat] || "#2f79ff") : "white",
                    color: catFilter === cat ? "white" : "#64748b",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                  }}>{cat === "all" ? "Tous" : cat}</button>
                ))}
              </div>
            )}
          </div>

          {/* Content modules grid */}
          {moduleView === "modules" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {filteredModules.map(mod => (
              <div key={mod.id} style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${CAT_COLORS[mod.cat]}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ background: CAT_COLORS[mod.cat], color: "white", borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 800 }}>M{mod.id}</div>
                  <div style={{ background: CAT_COLORS[mod.cat] + "18", color: CAT_COLORS[mod.cat], borderRadius: 12, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>{mod.cat}</div>
                </div>
                <ThumbnailField
                  value={getModuleThumbnail(mod.id)}
                  accentColor={CAT_COLORS[mod.cat]}
                />
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 7, lineHeight: 1.3 }}>{mod.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, marginBottom: mod.link ? 0 : 12 }}>{mod.desc}</div>
                <ExternalLink href={mod.link} label={mod.linkLabel} color={CAT_COLORS[mod.cat]} />
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, marginBottom: 6 }}>CONTENU</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {mod.needs.map((n, i) => (
                      <span key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, padding: "3px 8px", fontSize: 11, color: "#475569" }}>{n}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {filteredModules.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#94a3b8" }}>Aucun module trouvé pour « {searchMod} »</div>
            )}
          </div>
          )}

          {/* Headers grid */}
          {moduleView === "headers" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {filteredHeaders.map(h => (
              <div key={h.id} style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: "4px solid #2f79ff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ background: "#2f79ff", color: "white", borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 800 }}>{h.id}</div>
                  <div style={{ background: "#2f79ff18", color: "#2f79ff", borderRadius: 12, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>En-tête</div>
                </div>
                <ThumbnailField
                  value={getHeaderThumbnail(h.id)}
                  accentColor="#2f79ff"
                />
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 7, lineHeight: 1.3 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, marginBottom: h.link ? 0 : 12 }}>{h.desc}</div>
                <ExternalLink href={h.link} label={h.linkLabel} />
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, marginBottom: 6 }}>CONTENU</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {h.needs.map((n, i) => (
                      <span key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, padding: "3px 8px", fontSize: 11, color: "#475569" }}>{n}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {filteredHeaders.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#94a3b8" }}>Aucun en-tête trouvé pour « {searchMod} »</div>
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
            <div style={{ background: "white", borderRadius: 10, padding: "12px 20px", marginBottom: 18, display: "flex", gap: 20, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{pages.length} page{pages.length > 1 ? "s" : ""}</div>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>·</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{totalAssignments} modules assignés</div>
              <div style={{ flex: 1 }} />
              {Object.entries(STATUS).map(([k, s]) => statusCounts[k] > 0 && (
                <span key={k} style={{ background: s.bg, color: s.color, borderRadius: 12, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                  {s.emoji} {statusCounts[k]} {s.label}
                </span>
              ))}
              <span style={{ fontSize: 12, color: saveState === "error" ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>
                {saveState === "saving" && "Enregistrement…"}
                {saveState === "saved" && "✓ Sauvegardé"}
                {saveState === "error" && "Erreur de sauvegarde"}
              </span>
              <button onClick={exportCSV} style={{ background: "#0f1628", color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ↓ CSV
              </button>
            </div>
          )}

          {/* Add page */}
          {showAddPage ? (
            <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Nouvelle page</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Nom *</span>
                  <input value={newPage.name} onChange={e => setNewPage(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addPage()}
                    placeholder="ex: Vie parascolaire" autoFocus
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Slug / URL</span>
                  <input value={newPage.url} onChange={e => setNewPage(p => ({ ...p, url: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addPage()}
                    placeholder="ex: /vie-parascolaire"
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }} />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Notes (contexte, ancienne URL…)</span>
                <input value={newPage.notes} onChange={e => setNewPage(p => ({ ...p, notes: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addPage()}
                  placeholder="ex: Fusion des pages primaire + secondaire"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }} />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addPage} style={{ background: "#2f79ff", color: "white", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Ajouter</button>
                <button onClick={() => setShowAddPage(false)} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddPage(true)} style={{
              background: "white", border: "2px dashed #cbd5e1", borderRadius: 12, padding: "13px 20px",
              fontSize: 14, color: "#64748b", cursor: "pointer", width: "100%", textAlign: "left", marginBottom: 14, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Ajouter une page
            </button>
          )}

          {/* Empty state */}
          {pages.length === 0 && !showAddPage && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🗺️</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#64748b" }}>Aucune page encore</div>
              <div style={{ fontSize: 14, maxWidth: 380, margin: "0 auto" }}>
                Ajoutez les pages de la nouvelle arborescence pour commencer la mapping contenu → modules.
              </div>
            </div>
          )}

          {/* Page list */}
          <div>
            {pages.map(page => {
              const isOpen = expandedPage === page.id;
              const pSt = PAGE_STATUS[page.status] || PAGE_STATUS.draft;
              return (
                <div key={page.id} style={{ background: "white", borderRadius: 12, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>

                  {/* Row header */}
                  <div onClick={() => setExpandedPage(isOpen ? null : page.id)} style={{
                    padding: "13px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    borderLeft: "4px solid #2f79ff", background: isOpen ? "#fafcff" : "white"
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.name}</span>
                    {page.url && <span style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{page.url}</span>}
                    {page.header && <span style={{ fontSize: 11, background: "#2f79ff", color: "white", borderRadius: 12, padding: "2px 9px", fontWeight: 700, whiteSpace: "nowrap" }}>{page.header}</span>}
                    <select value={page.status} onChange={e => { e.stopPropagation(); updatePage(page.id, "status", e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, background: pSt.bg, color: pSt.color, fontWeight: 700, cursor: "pointer" }}>
                      {Object.entries(PAGE_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
                      {Object.entries(STATUS).map(([k, s]) => {
                        const count = page.modules.filter(m => m.status === k).length;
                        return count > 0 ? <span key={k} style={{ background: s.bg, color: s.color, borderRadius: 12, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{s.emoji} {count}</span> : null;
                      })}
                      {page.modules.length === 0 && <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); if (window.confirm(`Supprimer "${page.name}" ?`)) removePage(page.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#e2e8f0", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded body */}
                  {isOpen && (
                    <div style={{ padding: "14px 18px 18px", borderTop: "1px solid #f1f5f9" }}>
                      {page.notes && (
                        <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", marginBottom: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
                          📝 {page.notes}
                        </div>
                      )}

                      {/* Header selector */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>EN-TÊTE</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {HEADERS.map(h => {
                            const isSelected = page.header === h.id;
                            const thumb = getHeaderThumbnail(h.id);
                            return (
                              <button key={h.id} onClick={() => updatePage(page.id, "header", isSelected ? null : h.id)} style={{
                                padding: thumb ? "4px 12px 4px 4px" : "5px 12px", borderRadius: 20, border: isSelected ? "none" : "1px solid #e2e8f0",
                                cursor: "pointer", fontSize: 12, fontWeight: isSelected ? 800 : 600,
                                background: isSelected ? "#2f79ff" : "white",
                                color: isSelected ? "white" : "#64748b",
                                display: "flex", alignItems: "center", gap: 6,
                              }}>
                                {thumb && (
                                  <img src={thumb} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                )}
                                {h.id} — {h.name.replace("En-tête ", "").replace("En-tête", "")}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Module assignments */}
                      {page.modules.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>MODULES ASSIGNÉS</div>
                          {page.modules.map((ma, idx) => {
                            const mod = MODULES.find(m => m.id === ma.moduleId);
                            const st = STATUS[ma.status] || STATUS.missing;
                            return (
                              <div key={ma.moduleId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #f8fafc", flexWrap: "wrap" }}>
                                {/* Reorder */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                  <button onClick={() => moveModule(page.id, ma.moduleId, -1)} disabled={idx === 0}
                                    style={{ background: "none", border: "none", cursor: idx > 0 ? "pointer" : "default", color: idx > 0 ? "#94a3b8" : "#e2e8f0", fontSize: 10, padding: "0 2px", lineHeight: 1 }}>▲</button>
                                  <button onClick={() => moveModule(page.id, ma.moduleId, 1)} disabled={idx === page.modules.length - 1}
                                    style={{ background: "none", border: "none", cursor: idx < page.modules.length - 1 ? "pointer" : "default", color: idx < page.modules.length - 1 ? "#94a3b8" : "#e2e8f0", fontSize: 10, padding: "0 2px", lineHeight: 1 }}>▼</button>
                                </div>
                                {/* Badge */}
                                <div style={{ background: CAT_COLORS[mod.cat], color: "white", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>M{mod.id}</div>
                                {/* Name */}
                                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mod.name}</div>
                                </div>
                                {/* Status */}
                                <select value={ma.status} onChange={e => updateModule(page.id, ma.moduleId, "status", e.target.value)}
                                  style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, background: st.bg, color: st.color, fontWeight: 700, cursor: "pointer" }}>
                                  {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.emoji} {s.label}</option>)}
                                </select>
                                {/* Source */}
                                <input value={ma.source} onChange={e => updateModule(page.id, ma.moduleId, "source", e.target.value)}
                                  placeholder="URL source existante"
                                  style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, flex: "0 1 180px", minWidth: 0 }} />
                                {/* Notes */}
                                <input value={ma.notes} onChange={e => updateModule(page.id, ma.moduleId, "notes", e.target.value)}
                                  placeholder="Notes…"
                                  style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, flex: "0 1 160px", minWidth: 0 }} />
                                {/* Remove */}
                                <button onClick={() => removeModule(page.id, ma.moduleId)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#e2e8f0", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Module picker */}
                      {showModulePicker === page.id ? (
                        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginTop: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Sélectionner un module</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 7, maxHeight: 280, overflowY: "auto" }}>
                            {MODULES.filter(m => !page.modules.find(pm => pm.moduleId === m.id)).map(mod => {
                              const thumb = getModuleThumbnail(mod.id);
                              return (
                              <button key={mod.id} onClick={() => addModule(page.id, mod.id)} style={{
                                background: "white", border: `1px solid ${CAT_COLORS[mod.cat]}30`,
                                borderRadius: 8, padding: "8px 12px", textAlign: "left", cursor: "pointer",
                                display: "flex", gap: 8, alignItems: "center",
                              }}>
                                {thumb ? (
                                  <img src={thumb} alt="" style={{ width: 36, height: 24, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                                ) : (
                                  <span style={{ background: CAT_COLORS[mod.cat], color: "white", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>M{mod.id}</span>
                                )}
                                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{mod.name}</span>
                              </button>
                            );})}
                          </div>
                          <button onClick={() => setShowModulePicker(null)} style={{ marginTop: 10, background: "#e2e8f0", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>Fermer</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowModulePicker(page.id)} style={{
                          background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: 8,
                          padding: "8px 16px", fontSize: 13, color: "#64748b", cursor: "pointer", fontWeight: 600, marginTop: 4
                        }}>+ Assigner un module</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CSV MODAL ── */}
      {csvModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 24, width: "100%", maxWidth: 700, maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Exporter en CSV</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Copiez le contenu ci-dessous et collez-le dans un fichier .csv ou Google Sheets</div>
              </div>
              <button onClick={() => setCsvModal(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
            </div>
            <textarea
              readOnly
              value={csvModal}
              onClick={e => e.target.select()}
              style={{ flex: 1, minHeight: 300, fontFamily: "monospace", fontSize: 11, padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, resize: "none", color: "#1a1a1a", background: "#f8fafc", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadCsv(csvModal)} style={{ background: "#059669", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                ↓ Télécharger .csv
              </button>
              <button onClick={() => { navigator.clipboard.writeText(csvModal).then(() => alert("Copié ✓")); }} style={{ background: "#2f79ff", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", flex: 1 }}>
                📋 Copier tout
              </button>
              <button onClick={() => setCsvModal(null)} style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
