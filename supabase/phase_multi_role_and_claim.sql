-- Content Hub — multi-role accounts (e.g. Zoe: media + upload) and
-- upload-card self-assignment ("claim a card"). Purely additive: new
-- nullable columns, existing single `role` column and its data are left
-- untouched. Run once in the Supabase SQL Editor.

-- ── profiles.roles: array of roles, alongside the existing single `role`
--    column (kept as the "primary" role for defaults/manager checks) ─────
alter table profiles add column if not exists roles text[];

-- Backfill: everyone's array starts as just their existing single role.
update profiles set roles = array[role] where roles is null and role is not null;

-- Zoe specifically: media + upload.
update profiles set roles = array['media', 'upload'] where email = 'potatozoe02@gmail.com';

-- ── items.uploader: who on the upload team has claimed this card ───────
alter table items add column if not exists uploader text;
