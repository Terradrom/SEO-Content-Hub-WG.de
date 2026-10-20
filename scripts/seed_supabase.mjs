// Push data/seed-items.json into Supabase's items table.
//
// Usage:
//   node --env-file=.env.local scripts/seed_supabase.mjs           (append/upsert)
//   node --env-file=.env.local scripts/seed_supabase.mjs --reset   (delete all items first)
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function itemToRow(item) {
  return {
    id: item.id,
    person: item.person,
    type: item.type,
    topic: item.topic,
    keywords: item.keywords,
    topic_tree_link: item.topicTreeLink,
    page_link: item.pageLink,
    importance: item.importance || "Mittel",
    deadline: item.deadline || null,
    content_status: item.contentStatus || "Nicht begonnen",
    media_status: item.mediaStatus || null,
    mobile: !!item.mobile,
    indexed: !!item.indexed,
  };
}

async function main() {
  const reset = process.argv.includes("--reset");
  const itemsPath = path.join(__dirname, "..", "data", "seed-items.json");
  const items = JSON.parse(await readFile(itemsPath, "utf-8"));

  if (reset) {
    console.log("Resetting: deleting all rows from items...");
    await supabase.from("items").delete().neq("id", "");
  }

  if (items.length === 0) {
    console.log("data/seed-items.json is empty — nothing to import yet.");
    return;
  }

  const rows = items.map(itemToRow);
  const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  console.log(`Upserted ${rows.length} items. Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
