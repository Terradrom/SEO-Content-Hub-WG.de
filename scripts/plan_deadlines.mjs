// Assigns writers and deadlines to the round-1 plan in Supabase.
//
// - Each month = 20 working days (Mon–Fri), starting at --start, skipping
//   the --break range (e.g. Christmas).
// - Whole clusters (category + its subcategories + products) go to one
//   writer, balanced by effort (Kategorie 3, Unterkategorie 2, Produkt 1).
// - Within a writer's month, deadlines run in plan order, spread evenly
//   over the 20 days by effort.
// - Round 2 stays unassigned and without deadline.
//
// Usage:
//   node --env-file=.env.local scripts/plan_deadlines.mjs --start 2026-10-26 \
//     --writers "Katarina,Undra" --break 2026-12-21:2027-01-01 [--dry]
// Writes person + deadline to Supabase and mirrors them into data/seed-items.json.
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const start = arg("start");
const writers = (arg("writers") || "").split(",").map((s) => s.trim()).filter(Boolean);
const [breakFrom, breakTo] = (arg("break") || ":").split(":");
const dry = process.argv.includes("--dry");
if (!start || writers.length === 0) {
  console.error('Usage: plan_deadlines.mjs --start YYYY-MM-DD --writers "A,B" [--break YYYY-MM-DD:YYYY-MM-DD] [--dry]');
  process.exit(1);
}

const DAYS_PER_MONTH = 20;
const EFFORT = { Kategorie: 3, Unterkategorie: 2, Produkt: 1 };
const iso = (d) => d.toISOString().slice(0, 10);

// working days, skipping weekends and the break
const workdays = [];
for (let d = new Date(start + "T00:00:00Z"); workdays.length < DAYS_PER_MONTH * 3; d.setUTCDate(d.getUTCDate() + 1)) {
  const wd = d.getUTCDay();
  const day = iso(d);
  if (wd === 0 || wd === 6) continue;
  if (breakFrom && day >= breakFrom && day <= breakTo) continue;
  workdays.push(day);
}
const monthDays = [0, 1, 2].map((m) => workdays.slice(m * DAYS_PER_MONTH, (m + 1) * DAYS_PER_MONTH));

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: items, error } = await supabase.from("items").select("id,type,cluster,month,round,sort_order").order("sort_order");
if (error) throw error;

const plan = []; // { id, person, deadline }
for (let m = 1; m <= 3; m++) {
  const inMonth = items.filter((i) => i.round === 1 && i.month === m);
  // clusters in plan order with their effort
  const clusters = [];
  for (const it of inMonth) {
    let c = clusters.find((x) => x.name === it.cluster);
    if (!c) clusters.push((c = { name: it.cluster, items: [], effort: 0 }));
    c.items.push(it);
    c.effort += EFFORT[it.type] || 1;
  }
  // greedy balance, keeping plan order: next cluster goes to the writer with less effort so far
  const load = Object.fromEntries(writers.map((w) => [w, 0]));
  const queue = Object.fromEntries(writers.map((w) => [w, []]));
  for (const c of clusters) {
    const w = writers.reduce((a, b) => (load[b] < load[a] ? b : a));
    queue[w].push(c);
    load[w] += c.effort;
  }
  // spread each writer's items over the month's days by cumulative effort
  for (const w of writers) {
    const list = queue[w].flatMap((c) => c.items);
    const total = list.reduce((n, it) => n + (EFFORT[it.type] || 1), 0);
    let cum = 0;
    for (const it of list) {
      cum += EFFORT[it.type] || 1;
      const dayIdx = Math.min(DAYS_PER_MONTH - 1, Math.max(0, Math.ceil((cum / total) * DAYS_PER_MONTH) - 1));
      plan.push({ id: it.id, person: w, deadline: monthDays[m - 1][dayIdx] });
    }
    const types = (t) => list.filter((i) => i.type === t).length;
    console.log(`Monat ${m} · ${w}: ${queue[w].length} Cluster (${queue[w].map((c) => c.name).join(", ")}) · ${types("Kategorie")} Kat., ${types("Unterkategorie")} Unterkat., ${types("Produkt")} Produkte · Aufwand ${total} · ${monthDays[m - 1][0]} – ${monthDays[m - 1][DAYS_PER_MONTH - 1]}`);
  }
}
console.log(`\nZugewiesen: ${plan.length} Aufgaben, Runde 2 bleibt offen: ${items.filter((i) => i.round === 2).length}`);
if (dry) process.exit(0);

// reset round 2, then write grouped updates
await supabase.from("items").update({ person: null, deadline: null }).eq("round", 2);
const groups = new Map();
for (const p of plan) {
  const k = `${p.person}|${p.deadline}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(p.id);
}
for (const [k, ids] of groups) {
  const [person, deadline] = k.split("|");
  const { error: e } = await supabase.from("items").update({ person, deadline }).in("id", ids);
  if (e) throw e;
}
console.log(`Supabase aktualisiert (${groups.size} Gruppen).`);

// mirror into the seed file so a re-seed keeps the plan
const seedPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "seed-items.json");
const seed = JSON.parse(await readFile(seedPath, "utf8"));
const byId = new Map(plan.map((p) => [p.id, p]));
for (const s of seed) {
  const p = byId.get(s.id);
  s.person = p ? p.person : null;
  s.deadline = p ? p.deadline : null;
}
await writeFile(seedPath, JSON.stringify(seed, null, 1) + "\n");
console.log("data/seed-items.json aktualisiert.");
