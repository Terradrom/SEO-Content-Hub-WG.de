-- Content Hub — Phase 1 schema (items + file attachments + profiles)
--
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
--
-- NOTE on security: RLS is enabled with permissive policies for now (any
-- authenticated OR anon request can read/write). This is intentional for
-- Phase 1 — there's no login yet. Phase 2 replaces these policies with
-- real role-based ones once Supabase Auth + profiles.role are wired up.

-- ── items ────────────────────────────────────────────────────────────────
create table if not exists items (
  id text primary key,
  person text,
  type text not null,
  topic text not null default '',
  keywords text default '',
  topic_tree_link text default '',
  page_link text default '',
  importance text default 'Medium',
  deadline date,
  content_status text not null default 'Not Started',
  upload_status text default '',
  upload_issues text default '',
  mobile boolean not null default false,
  translated boolean not null default false,
  indexed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_person_idx on items (person);
create index if not exists items_content_status_idx on items (content_status);
create index if not exists items_upload_status_idx on items (upload_status);

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

-- ── item_files ───────────────────────────────────────────────────────────
create table if not exists item_files (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references items(id) on delete cascade,
  name text not null,
  drive_file_id text,
  web_view_link text,
  size_label text,
  added_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists item_files_item_id_idx on item_files (item_id);

-- ── profiles (Phase 2 will populate/use this; created now so the FK shape
--    is settled and Phase 4's uploader_reviews can reference it) ──────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text check (role in ('content', 'upload', 'manager')),
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

-- ── RLS (permissive for Phase 1 — tightened in Phase 2) ────────────────────
alter table items enable row level security;
alter table item_files enable row level security;
alter table profiles enable row level security;

drop policy if exists items_all on items;
create policy items_all on items for all using (true) with check (true);

drop policy if exists item_files_all on item_files;
create policy item_files_all on item_files for all using (true) with check (true);

drop policy if exists profiles_all on profiles;
create policy profiles_all on profiles for all using (true) with check (true);
