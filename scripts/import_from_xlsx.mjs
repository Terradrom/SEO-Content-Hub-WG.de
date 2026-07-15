// Node port of import_from_xlsx.py (no Python available on this machine).
// Same parsing logic — see that file's docstring for the status-mapping
// heuristic. Reads the five content tabs, skips month-divider rows, and
// maps each content row onto the app's item shape.
//
// Usage: node scripts/import_from_xlsx.mjs "path/to/spreadsheet.xlsx"
import xlsx from "xlsx";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TABS = ["Blogs", "Glossaries", "Subcategories", "Sub-Subcategories", "Premium Products"];

// 0-based column index -> field name (mirrors the Python script's COLS)
const COLS = {
  1: "topic",
  2: "topicTreeLink",
  3: "pageLink",
  4: "keywords",
  5: "topicIdeas",
  6: "importance",
  7: "deadline",
  8: "workingStatus",
  9: "contentLink",
  10: "contentIssues",
  12: "uploadStatusRaw",
  13: "mobile",
  14: "translated",
  15: "indexed",
  16: "uploadIssues",
};

function cellAt(sheet, row, col) {
  // row/col are 0-based here; xlsx addresses are 0-based via {r,c}
  const addr = xlsx.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  return cell ? cell.v : undefined;
}

function sheetRowCount(sheet) {
  const ref = sheet["!ref"];
  if (!ref) return 0;
  const range = xlsx.utils.decode_range(ref);
  return range.e.r; // 0-based last row index
}

function parseTab(sheet) {
  const items = [];
  let headerRow = null; // 0-based
  for (let r = 0; r <= 7; r++) {
    if (cellAt(sheet, r, 0) === "#") {
      headerRow = r;
      break;
    }
  }
  if (headerRow === null) return items;

  let assignee = null;
  for (let r = 1; r <= headerRow; r++) {
    for (let c = 0; c < 20; c++) {
      const v = cellAt(sheet, r, c);
      if (typeof v === "string" && v.includes("Assigned to:")) {
        assignee = v.split("Assigned to:").pop().trim();
      }
    }
  }

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
      const rowData = { number: first, person: assignee };
      for (const [colIdx, field] of Object.entries(COLS)) {
        rowData[field] = cellAt(sheet, r, Number(colIdx));
      }
      items.push(rowData);
    }
    r++;
  }
  return items;
}

function excelDateToIso(value) {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    const d = xlsx.SSF.parse_date_code(value);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return String(value).slice(0, 10);
}

function toAppItem(tabName, row, idx) {
  const deadlineStr = excelDateToIso(row.deadline);

  const workingStatus = typeof row.workingStatus === "string" ? row.workingStatus.trim() : "";
  const indexed = !!row.indexed;
  const contentLink = row.contentLink;

  const contentStatus = workingStatus.toLowerCase() === "done" ? "Ready for Upload" : "Not Started";
  const uploadStatus = contentStatus === "Ready for Upload" ? (indexed ? "Live" : "Queued") : "";

  const files = [];
  if (contentLink) {
    files.push({ name: "Google Doc", size: "link", addedAt: deadlineStr, url: String(contentLink) });
  }

  let keywords = row.keywords || "";
  if (typeof keywords === "string") {
    // Two mis-decoded em-dash artifacts observed in the source sheet:
    // (1) the byte pair U+0080 U+0094, (2) a stray U+00E2 immediately
    // before an otherwise-correct U+2014 em-dash.
    const mojibakePair = String.fromCharCode(0x80, 0x94);
    keywords = keywords.split(mojibakePair).join(String.fromCharCode(0x2014));
    const strayPattern = new RegExp(String.fromCharCode(0xe2) + "(?=" + String.fromCharCode(0x2014) + ")", "g");
    keywords = keywords.replace(strayPattern, "");
  } else {
    keywords = "";
  }

  return {
    id: `${tabName.toLowerCase().replace(/ /g, "-")}-${idx}`,
    person: row.person || "Unassigned",
    type: tabName,
    topic: row.topic || "",
    keywords,
    topicTreeLink: row.topicTreeLink || "",
    pageLink: row.pageLink || "",
    importance: row.importance || "Medium",
    deadline: deadlineStr,
    contentStatus,
    uploadStatus,
    uploadIssues: row.uploadIssues || "",
    files,
    mobile: !!row.mobile,
    translated: !!row.translated,
    indexed,
  };
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/import_from_xlsx.mjs path/to/spreadsheet.xlsx");
    process.exit(1);
  }

  const wb = xlsx.readFile(filePath, { cellDates: true });
  const allItems = [];

  for (const tab of TABS) {
    if (!wb.SheetNames.includes(tab)) {
      console.log(`  (skipping missing tab: ${tab})`);
      continue;
    }
    const sheet = wb.Sheets[tab];
    const rows = parseTab(sheet);
    rows.forEach((row, i) => allItems.push(toAppItem(tab, row, i + 1)));
    console.log(`  ${tab}: ${rows.length} items`);
  }

  const dataDir = path.join(__dirname, "..", "data");
  const outPath = path.join(dataDir, "seed-items.json");
  writeFileSync(outPath, JSON.stringify(allItems, null, 2));
  console.log(`\nWrote ${allItems.length} items to ${outPath}`);

  const metaPath = path.join(dataDir, "meta.json");
  const meta = {
    sourceFile: path.basename(filePath),
    importedAt: new Date().toISOString().slice(0, 19) + "+00:00",
    itemCount: allItems.length,
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`Wrote ${metaPath}`);
}

main();
