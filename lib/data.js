import seedItems from "../data/seed-items.json";
import seedMeta from "../data/meta.json";

export function getDataProvenance() {
  return seedMeta;
}

/*
 * ─────────────────────────────────────────────────────────────────────────
 * DATA LAYER — currently in-memory / mock. This is the single place a real
 * backend needs to plug in. Everything that reads or writes an "item"
 * should go through the functions at the bottom of this file so swapping
 * the mock store for real API calls (Supabase, Postgres, whatever) only
 * touches this file, not the components.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const PEOPLE = [...new Set(seedItems.map((i) => i.person))].filter(Boolean);
export const TYPES = ["Blogs", "Glossaries", "Subcategories", "Sub-Subcategories", "Premium Products"];
export const CONTENT_STATUSES = ["Not Started", "In Progress", "Ready for Upload"];
export const UPLOAD_STATUSES = ["Queued", "Uploading", "Issues", "Live"];

export function getSeedItems() {
  // deep clone so callers can't mutate the imported JSON module by reference
  return JSON.parse(JSON.stringify(seedItems));
}

/* ---------------- Topic Map (illustrative subset — see README) ---------------- */
export const HUBS = [
  { id: "sustainability", label: "Sustainability Hub", color: "#6B9C7D", angle: -90 },
  { id: "tech", label: "Tech & Innovation Hub", color: "#D4A24C", angle: 30 },
  { id: "office", label: "Office & Productivity Hub", color: "#7fa8c9", angle: 150 },
];

export const TOPIC_NODES = [
  { id: "rpet-glossary", label: "What Is RPET?", hub: "sustainability", kind: "content" },
  { id: "sustainable-glossary", label: "What Is 'Sustainable'?", hub: "sustainability", kind: "content" },
  { id: "fsc-glossary", label: "FSC Certification", hub: "sustainability", kind: "content" },
  { id: "greenwashing-glossary", label: "Greenwashing", hub: "sustainability", kind: "content" },
  { id: "eco-hightech-sub", label: "Eco-Friendly High-Tech", hub: "sustainability", kind: "category" },
  { id: "bamboo-glossary", label: "Bamboo Material", hub: "sustainability", kind: "content" },
  { id: "rpet-umbrella", label: "rPET Foldable Umbrella", hub: "sustainability", kind: "content" },
  { id: "eco-sports-cat", label: "Eco-Friendly Sports", hub: "sustainability", kind: "category" },
  { id: "eco-office-cat", label: "Eco Office", hub: "sustainability", kind: "category" },
  { id: "wireless-pad", label: "Wireless Charging Desk Pad", hub: "tech", kind: "content" },
  { id: "wireless-glossary", label: "Wireless Charging", hub: "tech", kind: "content" },
  { id: "chargers-cat", label: "Chargers", hub: "tech", kind: "category" },
  { id: "nfc-glossary", label: "What Is NFC?", hub: "tech", kind: "content" },
  { id: "connected-cat", label: "Connected Products", hub: "tech", kind: "category" },
  { id: "bamboo-nfc", label: "Bamboo NFC Key Chain", hub: "tech", kind: "content" },
  { id: "it-accessories-cat", label: "IT Accessories", hub: "office", kind: "category" },
  { id: "desk-organiser", label: "Desk Organiser LUBLIN", hub: "office", kind: "content" },
];

export const TOPIC_CROSS_EDGES = [
  ["rpet-glossary", "eco-hightech-sub"], ["rpet-glossary", "rpet-umbrella"], ["rpet-glossary", "eco-sports-cat"],
  ["sustainable-glossary", "fsc-glossary"], ["sustainable-glossary", "rpet-glossary"], ["sustainable-glossary", "greenwashing-glossary"],
  ["eco-hightech-sub", "bamboo-glossary"], ["eco-hightech-sub", "eco-sports-cat"], ["eco-hightech-sub", "eco-office-cat"], ["eco-hightech-sub", "wireless-pad"],
  ["wireless-pad", "wireless-glossary"], ["wireless-pad", "chargers-cat"], ["wireless-pad", "it-accessories-cat"], ["wireless-pad", "desk-organiser"],
  ["bamboo-nfc", "nfc-glossary"], ["bamboo-nfc", "connected-cat"], ["bamboo-nfc", "bamboo-glossary"], ["bamboo-nfc", "eco-hightech-sub"],
];

/* ---------------- Bonus Arcade seeds ---------------- */
export function getRacerSeeds() {
  return PEOPLE.map((name, i) => ({
    id: name.toLowerCase(),
    name,
    role: [...new Set(seedItems.filter((it) => it.person === name).map((it) => it.type))].join(" + "),
    pct: [4, 7, 5][i % 3],
    bonusDay: 10,
    totalDays: 30,
  }));
}

export const UPLOADER_SEEDS = [
  { id: "ravi", name: "Ravi (placeholder)", status: "idle", lives: 3, reviewDay: 0, reviewLength: 14, mistakes: 0 },
  { id: "sofia", name: "Sofia (placeholder)", status: "progress", lives: 2, reviewDay: 6, reviewLength: 14, mistakes: 1 },
];

/*
 * TODO(backend): replace everything above this line's "seed" role with real
 * reads from your database, and add real mutation functions here, e.g.:
 *
 *   export async function updateItem(id, patch) {
 *     return fetch(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
 *   }
 *
 * See README.md → "Next steps" for the suggested build order.
 */
