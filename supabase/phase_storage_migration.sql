-- Content Hub — switch file attachments from Google Drive (OAuth,
-- unreliable — see chat) to Supabase Storage. Run once in the SQL Editor.

alter table item_files add column if not exists storage_path text;

-- Public bucket: object URLs are directly downloadable without a signed
-- token, same convenience as the old Drive webViewLink. Files aren't
-- sensitive personal data (content drafts/product docs), and paths use
-- random ids, so this is an acceptable tradeoff for internal use.
insert into storage.buckets (id, name, public)
values ('item-files', 'item-files', true)
on conflict (id) do nothing;
