// One-off generator: parses the real spreadsheet's "Topic Ideas" column
// (each non-Blog row ends with "🔗 Link to: X, Y, Z") and the topicTreeLink
// hub prefix, fuzzy-matches link targets against other item topics, and
// writes lib/topic-map-data.js with the full node/edge graph.
//
// Usage: node scripts/build_topic_map.mjs "path/to/spreadsheet.xlsx"
import xlsx from "xlsx";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TABS = ["Blogs", "Glossaries", "Subcategories", "Sub-Subcategories", "Premium Products"];

const COLS = { 1: "topic", 2: "topicTreeLink", 5: "topicIdeas" };

function cellAt(sheet, row, col) {
  const addr = xlsx.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  return cell ? cell.v : undefined;
}

function sheetRowCount(sheet) {
  const ref = sheet["!ref"];
  if (!ref) return 0;
  return xlsx.utils.decode_range(ref).e.r;
}

function parseTab(sheet) {
  const rows = [];
  let headerRow = null;
  for (let r = 0; r <= 7; r++) {
    if (cellAt(sheet, r, 0) === "#") {
      headerRow = r;
      break;
    }
  }
  if (headerRow === null) return rows;

  const maxRow = sheetRowCount(sheet);
  let r = headerRow + 1;
  while (r <= maxRow) {
    const first = cellAt(sheet, r, 0);
    if (first === undefined || first === null) {
      r++;
      continue;
    }
    if (typeof first === "string" && first.trim().startsWith("▸")) {
      r++;
      continue;
    }
    if (typeof first === "number") {
      const row = {};
      for (const [colIdx, field] of Object.entries(COLS)) row[field] = cellAt(sheet, r, Number(colIdx));
      rows.push(row);
    }
    r++;
  }
  return rows;
}

// Consolidate the ~20 raw hub labels (two different naming schemes across
// tabs) into a smaller, stable set of canonical hubs.
const HUB_CANONICALIZE = [
  [/eco.*sustain|sustainability/i, "Sustainability"],
  [/tech.*smart|tech.*innovation/i, "Tech & Innovation"],
  [/premium.*luxury|^luxury/i, "Luxury"],
  [/wellness.*health|health.*wellness/i, "Wellness & Health"],
  [/drinkware|home.*living|home.*lifestyle|^lifestyle/i, "Home & Lifestyle"],
  [/events.*trade/i, "Events & Trade"],
  [/office.*productivity/i, "Office & Productivity"],
  [/corporate gifting/i, "Corporate Gifting"],
  [/seasonal/i, "Seasonal"],
  [/luggage.*travel/i, "Travel & Luggage"],
  [/sports.*lifestyle/i, "Sports & Lifestyle"],
  [/gastronomy/i, "Gastronomy"],
];

function canonicalHub(raw) {
  const cleaned = (raw || "").replace(/^\d+\s*·\s*/, "").trim();
  for (const [pattern, name] of HUB_CANONICALIZE) {
    if (pattern.test(cleaned)) return name;
  }
  return cleaned || "Other";
}

// Werbegeschenk.de brand colors plus a few darker/lighter steps of them,
// handed out by hub order (hub names depend on the sheet). All dark
// enough for the white count label drawn on top.
const HUB_PALETTE = ["#032f79", "#e8531e", "#50616b", "#c9a21f", "#1f5bb8", "#b8431a", "#343133", "#2c7a8c", "#7a4fb0", "#3d8b4a"];

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "with", "is", "what",
  "corporate", "gift", "gifts", "branded", "eco", "premium", "product", "products",
  "category", "glossary", "sub-subcategory", "subcategory", "hub",
]);

function scoreMatch(a, b) {
  const wordsA = new Set(normalize(a).split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w)));
  const wordsB = new Set(normalize(b).split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w)));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

function findBestMatch(reference, candidates, excludeId) {
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (c.id === excludeId) continue;
    const s = scoreMatch(reference, c.topic);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/build_topic_map.mjs path/to/spreadsheet.xlsx");
    process.exit(1);
  }

  const wb = xlsx.readFile(filePath, { cellDates: true });
  const items = [];
  for (const tab of TABS) {
    if (!wb.SheetNames.includes(tab)) continue;
    const rows = parseTab(wb.Sheets[tab]);
    rows.forEach((row, i) => {
      items.push({
        id: `${tab.toLowerCase().replace(/ /g, "-")}-${i + 1}`,
        type: tab,
        topic: row.topic || "",
        hub: canonicalHub(row.topicTreeLink),
        topicIdeas: row.topicIdeas || "",
      });
    });
  }

  const hubsUsed = [...new Set(items.map((i) => i.hub))];
  const hubAngleStep = 360 / hubsUsed.length;
  const HUBS = hubsUsed.map((h, i) => ({
    id: h.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: h,
    color: h === "Other" ? "#8a8586" : HUB_PALETTE[i % HUB_PALETTE.length],
    angle: i * hubAngleStep - 90,
    count: items.filter((it) => it.hub === h).length,
  }));
  const hubIdByLabel = new Map(HUBS.map((h) => [h.label, h.id]));

  const TOPIC_NODES = items.map((it) => ({
    id: it.id,
    label: it.topic.length > 34 ? it.topic.slice(0, 33) + "…" : it.topic,
    hub: hubIdByLabel.get(it.hub),
    kind: it.type === "Subcategories" || it.type === "Sub-Subcategories" ? "category" : "content",
  }));

  const edgeSet = new Map();
  let matched = 0;
  let unmatched = 0;
  const unmatchedSamples = [];

  for (const it of items) {
    const m = it.topicIdeas.match(/🔗\s*Link to:\s*(.+)$/i);
    if (!m) continue;
    const refs = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    for (const ref of refs) {
      const cleaned = ref.replace(/\b(glossary|category|categories|product|products|sub-subcategory|subcategory)\.?$/i, "").trim();
      const target = findBestMatch(cleaned, items, it.id);
      if (target) {
        matched++;
        const key = [it.id, target.id].sort().join("::");
        if (!edgeSet.has(key)) edgeSet.set(key, [it.id, target.id]);
      } else {
        unmatched++;
        if (unmatchedSamples.length < 15) unmatchedSamples.push(`"${ref}" (from ${it.topic})`);
      }
    }
  }

  const TOPIC_CROSS_EDGES = [...edgeSet.values()];

  console.log(`Hubs: ${HUBS.length}`);
  for (const h of HUBS) console.log(`  ${h.label}: ${h.count} item(s)`);
  console.log(`Nodes: ${TOPIC_NODES.length}`);
  console.log(`Edges matched: ${matched}, unmatched: ${unmatched}`);
  if (unmatchedSamples.length) {
    console.log("Sample unmatched references (dropped):");
    unmatchedSamples.forEach((s) => console.log("  -", s));
  }

  const out = `// GENERATED by scripts/build_topic_map.mjs — do not hand-edit.
// Re-run that script against a fresh spreadsheet export to regenerate.

export const HUBS = ${JSON.stringify(HUBS, null, 2)};

export const TOPIC_NODES = ${JSON.stringify(TOPIC_NODES, null, 2)};

export const TOPIC_CROSS_EDGES = ${JSON.stringify(TOPIC_CROSS_EDGES, null, 2)};
`;

  writeFileSync(path.join(__dirname, "..", "lib", "topic-map-data.js"), out);
  console.log("\nWrote lib/topic-map-data.js");
}

main();
