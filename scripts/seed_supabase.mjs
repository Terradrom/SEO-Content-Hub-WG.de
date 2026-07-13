// Push data/seed-items.json into Supabase's items/item_files tables.
//
// Usage:
//   node --env-file=.env.local scripts/seed_supabase.mjs           (append/upsert)
//   node --env-file=.env.local scripts/seed_supabase.mjs --reset   (truncate first — Phase 6 real-data cutover)
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
    importance: item.importance,
    deadline: item.deadline || null,
    content_status: item.contentStatus,
    upload_status: item.uploadStatus || "",
    upload_issues: item.uploadIssues || "",
    mobile: !!item.mobile,
    translated: !!item.translated,
    indexed: !!item.indexed,
  };
}

async function main() {
  const reset = process.argv.includes("--reset");
  const itemsPath = path.join(__dirname, "..", "data", "seed-items.json");
  const items = JSON.parse(await readFile(itemsPath, "utf-8"));

  if (reset) {
    console.log("Resetting: deleting all rows from item_files and items...");
    await supabase.from("item_files").delete().neq("item_id", "");
    await supabase.from("items").delete().neq("id", "");
  }

  const rows = items.map(itemToRow);
  const { error: itemsError } = await supabase.from("items").upsert(rows, { onConflict: "id" });
  if (itemsError) throw itemsError;
  console.log(`Upserted ${rows.length} items.`);

  let fileCount = 0;
  for (const item of items) {
    if (!item.files || item.files.length === 0) continue;
    const fileRows = item.files.map((f) => ({
      item_id: item.id,
      name: f.name,
      web_view_link: f.url || null,
      size_label: f.size,
      added_at: f.addedAt || null,
    }));
    const { error: filesError } = await supabase.from("item_files").insert(fileRows);
    if (filesError) throw filesError;
    fileCount += fileRows.length;
  }
  console.log(`Inserted ${fileCount} file rows.`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
