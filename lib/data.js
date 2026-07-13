import seedMeta from "../data/meta.json";

export function getDataProvenance() {
  return seedMeta;
}

/*
 * ─────────────────────────────────────────────────────────────────────────
 * DATA LAYER — items now live in Supabase (see app/api/items/*). This file
 * only holds shared constants and small helpers derived from live item
 * lists (e.g. PEOPLE), since those aren't rows of their own.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const TYPES = ["Blogs", "Glossaries", "Subcategories", "Sub-Subcategories", "Premium Products"];
export const CONTENT_STATUSES = ["Not Started", "In Progress", "Ready for Upload"];
export const UPLOAD_STATUSES = ["Queued", "Uploading", "Issues", "Live"];

export function derivePeople(items) {
  return [...new Set(items.map((i) => i.person))].filter(Boolean);
}

export async function fetchItems() {
  const res = await fetch("/api/items", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load items");
  return res.json();
}

export async function patchItem(id, patch) {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to save item");
  return res.json();
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

/* ---------------- Bonus Arcade seeds ----------------
 * TODO(Phase 4): still demo/simulated, per the build plan — replace with
 * real completed-vs-assigned counts once the race reads from `items`.
 */
const DEMO_RACE_PEOPLE = ["Mia", "Ashveena", "Michelle"];

export function getRacerSeeds() {
  return DEMO_RACE_PEOPLE.map((name, i) => ({
    id: name.toLowerCase(),
    name,
    role: "writer",
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
