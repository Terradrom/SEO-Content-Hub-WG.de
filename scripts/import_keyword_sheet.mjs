// Imports the "SEO Keyword Collection" sheet (Categories / Subcategories /
// Products tabs) into data/seed-items.json and data/meta.json, and builds
// lib/topic-map-data.js (one hub per cluster, links as edges).
//
// Usage:
//   node scripts/import_keyword_sheet.mjs data/source/<sheet>.xlsx [data/source/navtree.json]
// Then push to Supabase:
//   node --env-file=.env.local scripts/seed_supabase.mjs --reset
//
// The nav tree (optional) is the shop's category menu as JSON; it's used to
// turn the plain page names in the Categories tab's "Pages to Link To" into
// URLs. Subcategory and product tabs already carry "Name – URL" lines.
import xlsx from "xlsx";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const [, , sheetPath, treePath] = process.argv;
if (!sheetPath) {
  console.error("Usage: node scripts/import_keyword_sheet.mjs <sheet.xlsx> [navtree.json]");
  process.exit(1);
}

// Typos in the sheet's category names, fixed for display.
const NAME_FIX = { "Haushault und das Wohnen": "Haushalt und das Wohnen", "Kleidung und Textillien": "Kleidung und Textilien" };
const fixName = (s) => NAME_FIX[s.trim()] || s.trim();
const norm = (s) => fixName(s).toLowerCase().replace(/&/g, "und").replace(/[-\s]+/g, " ").trim();
const normUrl = (u) => (u || "").trim().replace(/\/$/, "").toLowerCase();
const list = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean).join(", ");
const slug = (s) => norm(s).replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const wb = xlsx.readFile(sheetPath);
const tab = (name) => xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: false });
const tree = treePath ? JSON.parse(await readFile(treePath, "utf8"))[0].children : [];

// Walks a tab and yields data rows with the month/round of the block they're in.
function* planned(rows) {
  let month = null, round = 1;
  for (const r of rows) {
    const a = String(r[0]);
    const m = a.match(/▸\s+Monat (\d)/);
    if (m) { month = +m[1]; round = 1; continue; }
    if (/▸\s+Runde 2/.test(a)) { month = null; round = 2; continue; }
    if (/^\d+$/.test(a) && String(r[1]).trim()) yield { r, num: +a, month, round };
  }
}

// ── Categories ─────────────────────────────────────────────────────────
const categories = [];
for (const { r, num, month } of planned(tab("Categories"))) {
  categories.push({ num, name: fixName(r[1]), url: r[2].trim(), k: [r[3], r[4], r[5]], prod: r[6], long: r[7], topics: r[8], links: r[9], note: r[11], month });
}
const clusterMonth = new Map(categories.map((c) => [norm(c.name), c.month]));
const clusterOrder = new Map(categories.map((c, i) => [norm(c.name), i]));
const catByName = new Map(categories.map((c) => [norm(c.name), c]));
const findCluster = (name) => catByName.get(norm(name)) || categories.find((c) => norm(c.name).slice(0, 6) === norm(name).slice(0, 6));

// Subcategory rows (all rounds) by name, for resolving plain link names.
const subRows = [...planned(tab("Subcategories"))];
const pageByName = new Map();
for (const c of categories) pageByName.set(norm(c.name), c.url);
for (const { r } of subRows) if (!pageByName.has(norm(r[1]))) pageByName.set(norm(r[1]), r[3].trim());

function resolveNamedLinks(text, clusterName) {
  const node = tree.find((n) => normUrl(n.url) === normUrl(catByName.get(norm(clusterName))?.url));
  return (text || "").split(",").map((t) => t.trim()).filter(Boolean).map((label) => {
    const child = node?.children.find((c) => norm(c.name) === norm(label));
    const url = child?.url || pageByName.get(norm(label)) || null;
    return url ? { label, url } : { label };
  });
}
const parseLinkLines = (text) =>
  (text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.lastIndexOf(" – https://");
    return i > 0 ? { label: l.slice(0, i).trim(), url: l.slice(i + 3).trim() } : { label: l };
  });

const pad = (n, w) => String(n).padStart(w, "0");
const items = [];
const base = (o) => ({
  person: null,
  deadline: null,
  contentStatus: "Nicht begonnen",
  mediaStatus: null,
  mobile: false,
  indexed: false,
  ...o,
  keywords: o.k.filter((x) => x && x.trim()).join(", "),
  mainKeyword: (o.k[0] || "").trim(),
  secondaryKeywords: o.k.slice(1).map((x) => (x || "").trim()).filter(Boolean).join(", "),
  productKeywords: list(o.prod),
  longtailKeywords: list(o.long),
  topics: list(o.topics),
  writerNote: (o.note || "").trim(),
});

for (const c of categories) {
  items.push(base({
    id: `kat-${pad(c.num, 2)}`, type: "Kategorie", topic: c.name, cluster: c.name, topicTreeLink: c.name, pageLink: c.url,
    importance: "Hoch", month: c.month, round: 1, typeRank: 0, num: c.num,
    k: c.k, prod: c.prod, long: c.long, topics: c.topics, note: c.note, links: resolveNamedLinks(c.links, c.name),
  }));
}
for (const { r, num, round } of subRows) {
  const cl = findCluster(r[2]);
  items.push(base({
    id: `sub-${pad(num, 3)}`, type: "Unterkategorie", topic: r[1].trim(), cluster: cl.name, topicTreeLink: `${cl.name} › ${r[1].trim()}`, pageLink: r[3].trim(),
    importance: round === 1 ? "Mittel" : "Niedrig", month: clusterMonth.get(norm(cl.name)), round, typeRank: 1, num,
    k: [r[4], r[5], r[6]], prod: r[7], long: r[8], topics: r[9], note: r[12], links: parseLinkLines(r[10]),
  }));
}
for (const { r, num } of planned(tab("Products"))) {
  const [catPart, subPart] = r[2].split("›").map((x) => x.trim());
  const cl = findCluster(catPart);
  items.push(base({
    id: `prod-${pad(num, 3)}`, type: "Produkt", topic: r[1].trim(), cluster: cl.name, topicTreeLink: `${cl.name} › ${subPart} › ${r[1].trim()}`, pageLink: r[3].trim(),
    importance: "Mittel", month: clusterMonth.get(norm(cl.name)), round: 1, typeRank: 2, num,
    k: [r[4], r[5], r[6]], prod: r[7], long: r[8], topics: r[9], note: r[12], links: parseLinkLines(r[10]),
  }));
}

// Plan order: round, month, cluster order, Kategorie → Unterkategorien → Produkte, sheet number.
items.sort((a, b) => a.round - b.round || (a.month ?? 9) - (b.month ?? 9) || clusterOrder.get(norm(a.cluster)) - clusterOrder.get(norm(b.cluster)) || a.typeRank - b.typeRank || a.num - b.num);
items.forEach((it, i) => { it.sortOrder = i + 1; delete it.typeRank; delete it.num; delete it.k; delete it.prod; delete it.long; delete it.note; });

const unresolved = items.flatMap((it) => it.links.filter((l) => !l.url).map((l) => `${it.cluster}: ${l.label}`));
await writeFile(path.join(root, "data", "seed-items.json"), JSON.stringify(items, null, 1) + "\n");
await writeFile(path.join(root, "data", "meta.json"), JSON.stringify({ sourceFile: path.basename(sheetPath), importedAt: new Date().toISOString(), itemCount: items.length }, null, 2) + "\n");

// ── Topic map: one hub per cluster, edges from internal links ─────────
const PALETTE = ["#032f79", "#e8531e", "#50616b", "#c9a21f", "#1f5bb8", "#b8431a", "#343133", "#2c7a8c", "#7a4fb0", "#3d8b4a"];
const HUBS = categories.map((c, i) => ({
  id: slug(c.name), label: c.name, color: PALETTE[i % PALETTE.length], angle: Math.round((i * 360) / categories.length - 90),
  count: items.filter((it) => it.cluster === c.name).length,
}));
const hubId = new Map(categories.map((c) => [c.name, slug(c.name)]));
const byUrl = new Map(items.map((it) => [normUrl(it.pageLink), it.id]));
const TOPIC_NODES = items.map((it) => ({ id: it.id, label: it.topic.length > 34 ? it.topic.slice(0, 33) + "…" : it.topic, hub: hubId.get(it.cluster), kind: it.type === "Produkt" ? "content" : "category" }));
const edgeSet = new Set();
for (const it of items) for (const l of it.links) {
  const to = l.url && byUrl.get(normUrl(l.url));
  if (to && to !== it.id) edgeSet.add([it.id, to].sort().join("|"));
}
const TOPIC_CROSS_EDGES = [...edgeSet].map((e) => e.split("|"));
const js = `// Generated by scripts/import_keyword_sheet.mjs – do not edit by hand.
// Source: ${path.basename(sheetPath)}
export const HUBS = ${JSON.stringify(HUBS)};
export const TOPIC_NODES = ${JSON.stringify(TOPIC_NODES)};
export const TOPIC_CROSS_EDGES = ${JSON.stringify(TOPIC_CROSS_EDGES)};
`;
await writeFile(path.join(root, "lib", "topic-map-data.js"), js);

const count = (f) => items.filter(f).length;
console.log(`Items: ${items.length} (Kategorien ${count((i) => i.type === "Kategorie")}, Unterkategorien ${count((i) => i.type === "Unterkategorie")} davon Runde 2: ${count((i) => i.round === 2)}, Produkte ${count((i) => i.type === "Produkt")})`);
for (const m of [1, 2, 3]) console.log(`  Monat ${m}: ${count((i) => i.month === m && i.round === 1)} Aufgaben`);
console.log(`Links: ${items.reduce((n, i) => n + i.links.length, 0)} total, ${unresolved.length} without URL`);
if (unresolved.length) console.log("  without URL:", [...new Set(unresolved)].join(" | "));
console.log(`Topic map: ${HUBS.length} hubs, ${TOPIC_NODES.length} nodes, ${TOPIC_CROSS_EDGES.length} links`);
