# Content Hub — handoff to Claude Code

> **Claude Code: read `CLAUDE.md` first.** It has one instruction that
> matters more than anything in this file — ask for a current export of the
> spreadsheet before you start changing things, since the seed data here is
> a snapshot, not a live feed.

Replaces a spreadsheet-based SEO content workflow (werbegeschenk.eu) with a
two-team production board: a **Content Team** that drafts and hands off
pieces, a **Data Entry / Upload Team** that publishes and QAs them, a
**Manager** rollup, an animated **Topic Map** of internal linking, and a
**Bonus Arcade** implementing two incentive mechanics (speed race + quality
hearts). Full backstory and earlier prototypes are in this conversation —
this file is the standalone brief for picking the work up cold.

## Stack

- **Next.js 14** (App Router), plain React, no UI framework — styling is one
  hand-written `app/globals.css` using CSS variables, ported directly from
  the working HTML prototypes. No Tailwind/CSS-in-JS to keep the handoff
  simple; feel free to introduce one if that fits your workflow better.
- **No backend yet.** All state lives in React `useState`, seeded from
  `data/seed-items.json`. This is intentional — see "Next steps" below.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

## What's real vs mocked

| Feature | Status |
|---|---|
| Content Team board (drag/drop, filters, card modal) | ✅ fully working, client-side |
| Upload Team board + handoff from Content board | ✅ fully working, client-side |
| Manager dashboard rollups | ✅ fully working, client-side |
| Keyword / topic-tree / page-URL fields + copy buttons | ✅ working |
| Topic Map visualization | ✅ working, but seeded with an **illustrative subset** of nodes/edges (see below) |
| Speed Race (rocket) | ✅ working animation + win logic, on **simulated** progress data |
| Quality Hearts (upload accuracy) | ✅ working animation + win/lose logic, on **fake uploaders** ("Ravi"/"Sofia" placeholders — real team not yet named) |
| File attachment | ⚠️ mocked — stores filename/size only, no real upload |
| Login / roles (writer, uploader, manager) | ❌ not built — manager mode is a shared PIN (`2026`) in `HeartsPanel.js`, purely for demo |
| Persistence across reloads / across users | ❌ not built — everything is in-memory and resets on refresh |
| Real data | ✅ `data/seed-items.json` was generated from the actual spreadsheet via `scripts/import_from_xlsx.py` (127 of ~148 rows — a few edge-case rows in Sub-Subcategories didn't parse cleanly, worth a spot check). **It's a snapshot, not live** — see `data/meta.json` for exactly which file and when, and see `CLAUDE.md` for what to do about it |

## Project structure

```
app/                  Next.js routes — currently just one page that mounts AppShell
components/
  AppShell.js          top-level state (items, active view, open card) + routing between views
  Nav.js                tab bar
  ContentBoard.js       Not Started → In Progress → Ready for Upload
  UploadBoard.js        Queued → Uploading → Issues → Live (only shows items handed off)
  ManagerDashboard.js   rollups for both teams
  TopicMap.js           animated SVG link graph
  RaceTrack.js          speed-bonus rocket race
  HeartsPanel.js        accuracy-bonus hearts + manager gate
  Card.js / CardModal.js  shared card UI + detail/edit modal
lib/
  data.js              ⭐ the mock data layer — every read/write should eventually route through here
  format.js            date helpers (note: "today" is hardcoded to 2026-07-11 to match the seed data)
data/
  seed-items.json       generated from the real spreadsheet
  meta.json             ⭐ source filename + import timestamp — check this before trusting the data
scripts/
  import_from_xlsx.py   regenerate seed-items.json (+ meta.json) from a fresh export of the sheet
CLAUDE.md               ⭐ read this first — onboarding instruction for whoever picks this up
```

## Next steps, in the order I'd tackle them

1. **Pick a database and move `lib/data.js` behind API routes.**
   Supabase is the path of least resistance (free tier, Postgres, works
   well with Next.js). Replace `getSeedItems()` with a real fetch, add
   `app/api/items/[id]/route.js` for updates, and have `CardModal`'s
   `onSave` and the board `onMove` handlers call it instead of mutating
   local state directly.

2. **Auth: Google OAuth via NextAuth.js**, restricted to your Workspace
   domain. Three roles: `content`, `upload`, `manager`. Gate the boards and
   the Hearts-panel "break a heart" action by role instead of the PIN.
   Since this is an internal tool on a Workspace account, the Drive/OAuth
   consent screen doesn't need Google's verification review.

3. **Google Drive for real file storage.** Don't stand up separate blob
   storage — call the Drive API (resumable upload or the Picker) from the
   dropzone in `CardModal.js`, store the returned `fileId` + `webViewLink`
   in the database instead of a bare filename. The business Drive account
   already has the space.

4. **Wire the Bonus Arcade to real data.** Speed Race: replace the
   `pct`/`day` simulation in `RaceTrack.js` with actual
   completed-vs-total counts and elapsed time from the real deadlines.
   Hearts: replace `UPLOADER_SEEDS` with your actual upload-team members
   and trigger `startReview` automatically when an item's `uploadStatus`
   flips to `Live`, instead of a manual button.

5. **Fill out the Topic Map.** `lib/data.js` → `TOPIC_NODES` /
   `TOPIC_CROSS_EDGES` is currently a ~17-node illustrative slice. The full
   linking plan lives in the sheet's "Topic Ideas" column as
   `🔗 Link to: X, Y, Z` text — worth a small script to parse that into the
   same `{id, label, hub, kind}` / `[from, to]` shape rather than
   hand-entering it.

6. **Deploy.** Vercel's free tier is the natural fit for a Next.js app this
   size. Supabase free tier + your existing Drive covers storage. Total
   ongoing cost should be $0 unless/until you outgrow those tiers.

## Known rough edges worth a look

- `scripts/import_from_xlsx.py`'s status mapping is a first-pass heuristic
  (`Working Status == "Done"` → `Ready for Upload`, `Indexed` → `Live`,
  everything else → `Not Started`). There's no "In Progress" signal in the
  original sheet, so nothing currently lands there on import — worth
  deciding what should (e.g. "deadline is within N days and not done yet").
- `PEOPLE` in `lib/data.js` is derived from whoever appears in the seed
  data, so it'll silently pick up new writers on the next import — but the
  Bonus Arcade's `UPLOADER_SEEDS` is still hand-entered placeholder people.
- Drag-and-drop is native HTML5 DnD (no library). It works but has the
  usual HTML5-DnD quirks on touch devices — worth swapping for a small
  library (`@dnd-kit/core`) if mobile use turns out to matter.
