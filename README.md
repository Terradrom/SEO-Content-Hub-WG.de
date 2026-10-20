# SEO Content Hub WG.de

> **Claude Code: read `CLAUDE.md` first.**

German clone of the werbegeschenk.eu Content Hub, for **werbegeschenk.de**.
A production board for two teams plus a manager:

- **Content-Team** writes and publishes texts: `Nicht begonnen → In Arbeit → Online`
- **Media-Team** adds images once a text is online:
  `Bereit für Medien → Medien erstellt → Medien freigegeben → Medien online`
- **Manager** sees everything, rollups, and manages reminder pauses
- **Themen-Map** (internal-linking graph) and **Bonus-Arcade** (speed race for the content team)

Differences from the EU hub: German UI and emails, Werbegeschenk.de branding
(Roboto; navy `#032f79`, yellow `#fbd53b`, orange `#e8531e`), no upload team
(the content team publishes itself), no file uploads, no Quality Hearts.

## Stack

Next.js 14 (App Router), plain React, one hand-written `app/globals.css`.
Supabase (Postgres + Auth) for data and logins, Resend for emails, Vercel for
hosting plus a daily cron (`vercel.json`) that sends overdue reminders.

## Setup

1. Create the Supabase project, then run `supabase/schema.sql` once in the SQL Editor.
2. Fill in `.env.local` (template: `.env.example`).
3. Add the team to `scripts/create_users.mjs`, then run
   `node --env-file=.env.local scripts/create_users.mjs`.
4. Import tasks from the spreadsheet (see `CLAUDE.md`), then
   `node --env-file=.env.local scripts/seed_supabase.mjs`.
5. `npm install && npm run dev` → http://localhost:3000

## Structure

```
app/                   pages + API routes (items, profiles, notification pauses, cron)
components/            boards, card modal, manager dashboard, topic map, race track
lib/items-map.js       ⭐ statuses, role → field permissions, content → media handoff
lib/email.js           branded German reminder emails
supabase/schema.sql    full database schema (fresh project)
scripts/               spreadsheet import, topic-map builder, user creation, seeding
```

## Open items

- The spreadsheet import scripts (`scripts/import_from_xlsx.*`, `scripts/build_topic_map.mjs`)
  still expect the EU sheet's tab and column names. Adapt them to the German sheet.
- `TYPES` in `lib/data.js` (content types) should match the German sheet's categories.
