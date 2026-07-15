-- Content Hub — overdue-item email reminders: per-person pause windows.
-- Run this once in the Supabase SQL Editor.

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

alter table notification_pauses enable row level security;

-- Same pattern as the rest of the schema: the app's API routes use the
-- service-role key and enforce manager-only access themselves; this RLS
-- policy is just defense-in-depth if ever queried with a user session.
drop policy if exists notification_pauses_all on notification_pauses;
create policy notification_pauses_all on notification_pauses for all using (true) with check (true);
