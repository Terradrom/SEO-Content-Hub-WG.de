-- Content Hub — Media Team (third pipeline stage).
-- Purely additive: new nullable column, new role option, new file
-- category. Nothing existing is dropped, renamed, or has its type
-- changed — safe to run against the live database with zero downtime
-- and zero data loss. Run once in the Supabase SQL Editor.

-- ── items.media_status ──────────────────────────────────────────────────
-- null = item hasn't reached the media stage yet (or, after "Done", has
-- already completed one full media cycle and shouldn't re-enter it).
alter table items add column if not exists media_status text;

alter table items drop constraint if exists items_media_status_check;
alter table items add constraint items_media_status_check
  check (media_status is null or media_status in (
    'Ready to add media', 'Media created', 'Media approved', 'Ready for upload', 'Done'
  ));

create index if not exists items_media_status_idx on items (media_status);

-- ── item_files.category ─────────────────────────────────────────────────
-- Distinguishes the existing "Document" dropzone from the media team's
-- new multi-image upload area. Existing rows default to 'document' so
-- nothing already uploaded changes category or goes missing.
alter table item_files add column if not exists category text not null default 'document';

alter table item_files drop constraint if exists item_files_category_check;
alter table item_files add constraint item_files_category_check
  check (category in ('document', 'media'));

-- ── profiles.role: add 'media' as a valid role ──────────────────────────
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('content', 'upload', 'manager', 'media'));
