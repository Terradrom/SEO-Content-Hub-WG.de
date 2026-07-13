#!/usr/bin/env python3
"""
Import the original "SEO Content Hub" spreadsheet into data/seed-items.json.

Usage:
    python3 scripts/import_from_xlsx.py path/to/spreadsheet.xlsx

Reads the five content tabs (Blogs, Glossaries, Subcategories,
Sub-Subcategories, Premium Products), skips the month-divider rows
("▸ July 2026" etc.), and maps each content row onto the app's item shape.

Status-mapping heuristic (adjust to taste — this is a first pass, not gospel):
  - Working Status == "Done"  -> contentStatus = "Ready for Upload"
  - Content Link present      -> stored as a file entry (type: "link")
  - Indexed == True           -> uploadStatus = "Live"
  - contentStatus == "Ready for Upload" and not indexed -> uploadStatus = "Queued"
  - everything else           -> contentStatus = "Not Started", uploadStatus = ""

Re-run this any time the live sheet changes to refresh the app's seed data
without hand-editing JSON.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from openpyxl import load_workbook
except ImportError:
    sys.exit("Missing dependency. Run: pip install openpyxl --break-system-packages")

TABS = ["Blogs", "Glossaries", "Subcategories", "Sub-Subcategories", "Premium Products"]

# column index (0-based) -> field name, based on the sheet's header row
COLS = {
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
}


def parse_tab(ws):
    items = []
    # find header row (contains "#" then "Topic")
    header_row = None
    for r in range(1, 8):
        if ws.cell(r, 1).value == "#":
            header_row = r
            break
    if header_row is None:
        return items

    assignee = None
    for row in ws.iter_rows(min_row=2, max_row=header_row):
        for cell in row:
            if isinstance(cell.value, str) and "Assigned to:" in cell.value:
                assignee = cell.value.split("Assigned to:")[-1].strip()

    r = header_row + 1
    max_row = ws.max_row
    while r <= max_row:
        first = ws.cell(r, 1).value
        if first is None:
            r += 1
            continue
        if isinstance(first, str) and first.strip().startswith("▸"):
            r += 1
            continue
        if isinstance(first, (int, float)):
            row_data = {"number": int(first), "person": assignee}
            for col_idx, field in COLS.items():
                val = ws.cell(r, col_idx + 1).value
                row_data[field] = val
            items.append(row_data)
        r += 1
    return items


def to_app_item(tab_name, row, idx):
    deadline = row.get("deadline")
    deadline_str = deadline.date().isoformat() if hasattr(deadline, "date") else (str(deadline)[:10] if deadline else "")

    working_status = (row.get("workingStatus") or "").strip() if isinstance(row.get("workingStatus"), str) else ""
    indexed = bool(row.get("indexed"))
    content_link = row.get("contentLink")

    content_status = "Ready for Upload" if working_status.lower() == "done" else "Not Started"
    if content_status == "Ready for Upload":
        upload_status = "Live" if indexed else "Queued"
    else:
        upload_status = ""

    files = []
    if content_link:
        files.append({"name": "Google Doc", "size": "link", "addedAt": deadline_str, "url": str(content_link)})

    keywords = row.get("keywords") or ""
    if isinstance(keywords, str):
        keywords = keywords.replace("\u0080\u0094", "—")[:220]

    return {
        "id": f"{tab_name.lower().replace(' ', '-')}-{idx}",
        "person": row.get("person") or "Unassigned",
        "type": tab_name,
        "topic": row.get("topic") or "",
        "keywords": keywords,
        "topicTreeLink": row.get("topicTreeLink") or "",
        "pageLink": row.get("pageLink") or "",
        "importance": row.get("importance") or "Medium",
        "deadline": deadline_str,
        "contentStatus": content_status,
        "uploadStatus": upload_status,
        "uploadIssues": row.get("uploadIssues") or "",
        "files": files,
        "mobile": bool(row.get("mobile")),
        "translated": bool(row.get("translated")),
        "indexed": indexed,
    }


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python3 scripts/import_from_xlsx.py path/to/spreadsheet.xlsx")
    path = Path(sys.argv[1])
    wb = load_workbook(path, data_only=True)

    all_items = []
    for tab in TABS:
        if tab not in wb.sheetnames:
            print(f"  (skipping missing tab: {tab})")
            continue
        ws = wb[tab]
        rows = parse_tab(ws)
        for i, row in enumerate(rows, start=1):
            all_items.append(to_app_item(tab, row, i))
        print(f"  {tab}: {len(rows)} items")

    data_dir = Path(__file__).resolve().parent.parent / "data"
    out_path = data_dir / "seed-items.json"
    out_path.write_text(json.dumps(all_items, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(all_items)} items to {out_path}")

    meta_path = data_dir / "meta.json"
    meta = {
        "sourceFile": path.name,
        "importedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "itemCount": len(all_items),
    }
    meta_path.write_text(json.dumps(meta, indent=2))
    print(f"Wrote {meta_path} — keep this up to date so it's obvious how fresh the data is.")


if __name__ == "__main__":
    main()
