# Instructions for Claude Code

Read this before doing anything else in this project.

## First thing to do, every time you start a session here

The data in `data/seed-items.json` was generated from a **snapshot** of the
team's spreadsheet (`2026-07-05_SEO_Content_Hub_V_10__Final_Version_.xlsx`,
imported via `scripts/import_from_xlsx.py`). It is real data, not sample
data — but it goes stale the moment anyone edits the live sheet, and that
will have happened by the time you're reading this.

**Before writing or changing any code, ask the person for their current
exported `.xlsx` of the SEO Content Hub spreadsheet.**

- If they provide one: run `python3 scripts/import_from_xlsx.py <path>` to
  regenerate `data/seed-items.json`, check `data/meta.json` updated with the
  new source filename/date, and briefly confirm what changed (row count,
  any new tabs/columns the parser doesn't recognize yet).
- If they don't have it handy or want to proceed without it: say clearly
  that you're continuing on the existing snapshot (name the date from
  `data/meta.json`) so it's an explicit, visible decision rather than a
  silent assumption — then proceed.

Do not silently treat the existing `data/seed-items.json` as current. This
matters more than it might seem: task counts, deadlines, and bonus-eligible
progress in the Manager view and Bonus Arcade are only meaningful if the
underlying data is real, and stale deadlines in particular will make the
race/hearts mechanics compute nonsense (overdue items that aren't actually
overdue, etc.).

## Then read README.md

It has the full architecture, what's real vs mocked, and the suggested
build order (database → auth → Drive uploads → wiring the bonus mechanics
to live data → deploy).
