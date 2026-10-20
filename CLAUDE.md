# Instructions for Claude Code

This is the **German (werbegeschenk.de)** clone of the EU Content Hub. It has
its own Supabase project and its own Vercel project. Never push to or deploy
over the EU project (`Terradrom/seo-content-hub`). The `eu` git remote is
fetch-only on purpose.

## Data comes from a spreadsheet

Tasks are imported from the team's SEO Content Hub spreadsheet (`.xlsx`) into
`data/seed-items.json` and then into Supabase (`scripts/seed_supabase.mjs`).
`data/meta.json` records which file and when.

**Before changing data-dependent things, ask for the current export of the
German spreadsheet.** If there is none yet, say clearly that you're working
without real data. The import scripts were written for the EU sheet and must
be adapted to the German sheet's tabs and columns on first import.

## Conventions

- All user-facing text is German (informal "du"). Status values are stored in
  German exactly as shown in the UI (see `lib/items-map.js`); the DB schema
  checks them, so change both together.
- Branding: Roboto; colors as CSS variables in `app/globals.css`
  (navy `#032f79`, yellow `#fbd53b`, orange `#e8531e`, ink `#343133`,
  stone `#d8d4d4`, slate `#50616b`). Logo: `public/logo.png`.
- Roles: `content`, `media`, `manager`. Field permissions per role live in
  `lib/items-map.js` and are enforced in `app/api/items/[id]/route.js`.

Then read `README.md`.
