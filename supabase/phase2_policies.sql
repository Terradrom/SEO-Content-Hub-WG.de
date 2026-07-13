-- Content Hub — Phase 2: tighten RLS now that Supabase Auth + roles exist.
-- Run this once in the Supabase SQL Editor, after schema.sql.
--
-- Design: the app's own API routes (app/api/**) always use the service-role
-- key, which bypasses RLS entirely — the *actual* enforcement for those
-- routes is the role check in app/api/items/[id]/route.js. These policies
-- are the defense-in-depth layer for anything hitting Supabase directly
-- with a user's own session (the browser client, used today only for
-- auth — but this closes the door if that ever changes).

-- ── items: any signed-in user with a role can read; no direct writes ──────
drop policy if exists items_all on items;

create policy items_select on items for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role is not null));

-- (no insert/update/delete policy → direct writes via the anon/browser
-- client are denied; all writes go through the API's service-role client,
-- which enforces per-role field permissions itself.)

-- ── item_files: same read rule, no direct writes ──────────────────────────
drop policy if exists item_files_all on item_files;

create policy item_files_select on item_files for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role is not null));

-- ── profiles: everyone can read all profiles (needed for e.g. showing
--    uploader names); a user may update their own display_name but never
--    their own role (role changes go through the service-role script) ────
drop policy if exists profiles_all on profiles;

create policy profiles_select on profiles for select
  using (true);

create policy profiles_update_own_name on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role is not distinct from (select role from profiles p where p.id = auth.uid()));
