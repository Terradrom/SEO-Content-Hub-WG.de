-- SEO Content Hub WG.de — complete database schema for the German project.
--
-- Run this once on a fresh Supabase project (SQL Editor → New query →
-- paste → Run). Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- Security model: the app's API routes (app/api/**) use the service-role
-- key, which bypasses RLS — the real per-role enforcement is in
-- app/api/items/[id]/route.js. The policies below are defense-in-depth for
-- anything hitting Supabase directly with a user's own session.

-- ── items ────────────────────────────────────────────────────────────────
create table if not exists items (
  id text primary key,
  person text,
  type text not null,
  topic text not null default '',
  keywords text default '',
  topic_tree_link text default '',
  page_link text default '',
  importance text not null default 'Mittel'
    check (importance in ('Hoch', 'Mittel', 'Niedrig')),
  deadline date,
  content_status text not null default 'Nicht begonnen'
    check (content_status in ('Nicht begonnen', 'In Arbeit', 'Online')),
  -- null = text isn't online yet, so the media stage hasn't started
  media_status text
    check (media_status is null or media_status in ('Bereit für Medien', 'Medien erstellt', 'Medien freigegeben', 'Medien online')),
  -- who on the media team has claimed the card
  media_person text,
  mobile boolean not null default false,
  indexed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── SEO brief per item (imported from the keyword sheet) ───────────────
-- cluster = the category the item belongs to (topic cluster); month/round
-- = when it's planned (round 2 = later); sort_order = order within the
-- plan. links = internal links as [{ "label": "...", "url": "..." }].
alter table items add column if not exists cluster text;
alter table items add column if not exists month smallint;
alter table items add column if not exists round smallint not null default 1;
alter table items add column if not exists sort_order integer;
alter table items add column if not exists main_keyword text default '';
alter table items add column if not exists secondary_keywords text default '';
alter table items add column if not exists product_keywords text default '';
alter table items add column if not exists longtail_keywords text default '';
alter table items add column if not exists topics text default '';
alter table items add column if not exists links jsonb not null default '[]'::jsonb;
alter table items add column if not exists writer_note text default '';

create index if not exists items_person_idx on items (person);
create index if not exists items_cluster_idx on items (cluster);
create index if not exists items_plan_idx on items (round, month, sort_order);
create index if not exists items_content_status_idx on items (content_status);
create index if not exists items_media_status_idx on items (media_status);

-- keep updated_at current on every row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

-- ── profiles (one per auth user) ─────────────────────────────────────────
-- `role` is the primary role (used for defaults and manager checks);
-- `roles` lists every role a person holds (e.g. content + media).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text check (role in ('content', 'media', 'manager')),
  roles text[],
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── notification_pauses (per-person pause for overdue reminders) ────────
create table if not exists notification_pauses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists notification_pauses_profile_idx on notification_pauses (profile_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table items enable row level security;
alter table profiles enable row level security;
alter table notification_pauses enable row level security;

-- items: any signed-in user with a role can read; no direct writes (all
-- writes go through the API's service-role client).
drop policy if exists items_select on items;
create policy items_select on items for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role is not null));

-- profiles: everyone signed in can read (needed for names); a user may
-- update their own display_name but never their own role.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (auth.uid() is not null);

drop policy if exists profiles_update_own_name on profiles;
create policy profiles_update_own_name on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role is not distinct from (select role from profiles p where p.id = auth.uid())
    and roles is not distinct from (select roles from profiles p where p.id = auth.uid())
  );

-- notification_pauses: managed only through the manager-gated API.
drop policy if exists notification_pauses_select on notification_pauses;
create policy notification_pauses_select on notification_pauses for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'manager'));
