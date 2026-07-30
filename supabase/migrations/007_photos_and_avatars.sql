-- supabase/migrations/007_photos_and_avatars.sql
-- Run in the Supabase SQL Editor after 006.
--
-- Adds Supabase Storage for two things: profile avatars (any signed-in
-- user) and event photos (up to 5 per event, organizer-managed). Storage
-- access control works differently from regular tables — policies live on
-- storage.objects and match against the file PATH, so the path convention
-- chosen here matters: avatars go to {user_id}/{filename}, event photos go
-- to {event_id}/{filename}. The app must upload to exactly these path
-- shapes or the policies below will reject it.

-- ---------------------------------------------------------------------
-- Buckets — both public (read access via the public URL bypasses RLS
-- entirely for GET requests; RLS below only governs uploads/deletes,
-- which always go through the authenticated API regardless of the
-- bucket's public/private setting).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- avatars: a user can upload/replace/delete only inside their own
-- {user_id}/ folder. storage.foldername(name) splits the object path on
-- '/' — [1] is the first segment.
-- ---------------------------------------------------------------------
drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar" on storage.objects
  for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- event-photos: same idea, but folder is {event_id}/ and ownership is
-- checked against the events table (is this event's poster me?) rather
-- than a direct auth.uid() match on the path.
-- ---------------------------------------------------------------------
drop policy if exists "Organizers manage own event photos" on storage.objects;
create policy "Organizers manage own event photos" on storage.objects
  for all
  using (
    bucket_id = 'event-photos'
    and exists (
      select 1 from events e
      where e.id::text = (storage.foldername(name))[1] and e.posted_by_user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'event-photos'
    and exists (
      select 1 from events e
      where e.id::text = (storage.foldername(name))[1] and e.posted_by_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- profiles: avatar URL
-- ---------------------------------------------------------------------
alter table profiles add column if not exists avatar_url text;

-- ---------------------------------------------------------------------
-- event_photos: one row per uploaded photo, up to 5 per event (enforced
-- by the trigger below, not just the frontend).
-- ---------------------------------------------------------------------
create table if not exists event_photos (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table event_photos enable row level security;

drop policy if exists "Public read photos of approved events" on event_photos;
create policy "Public read photos of approved events" on event_photos
  for select using (
    exists (select 1 from events e where e.id = event_photos.event_id and e.status = 'approved')
  );

drop policy if exists "Admins read all event photos" on event_photos;
create policy "Admins read all event photos" on event_photos
  for select using (is_admin());

drop policy if exists "Organizers manage own event photo rows" on event_photos;
create policy "Organizers manage own event photo rows" on event_photos
  for all
  using (exists (select 1 from events e where e.id = event_photos.event_id and e.posted_by_user_id = auth.uid()))
  with check (exists (select 1 from events e where e.id = event_photos.event_id and e.posted_by_user_id = auth.uid()));

-- Server-side cap at 5 — the UI enforces this too, but this is the real
-- guarantee, same philosophy as every other "client suggests, database
-- decides" rule in this app (moderation status, posted_by_user_id, etc.).
create or replace function public.enforce_max_event_photos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from event_photos where event_id = new.event_id) >= 5 then
    raise exception 'Maximum of 5 photos per event';
  end if;
  return new;
end;
$$;

drop trigger if exists on_event_photo_insert on event_photos;
create trigger on_event_photo_insert
  before insert on event_photos
  for each row execute function public.enforce_max_event_photos();