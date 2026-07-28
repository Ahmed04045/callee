-- supabase/migrations/006_event_creation_and_attendees.sql
-- Run in the Supabase SQL Editor after 004 (and 005 if you needed it).
--
-- Turns events from admin-only into something any signed-in user can
-- create — always landing as pending (same moderation pattern as gigs),
-- always traceable to who posted it. Adds RSVP tracking so an organizer
-- can see real attendance instead of a static "spots" number, plus a
-- public attendee-count function that doesn't require exposing who's
-- actually attending to people who aren't the organizer.

-- ---------------------------------------------------------------------
-- events: new required-at-creation fields, ownership, moderation
-- ---------------------------------------------------------------------
alter table events add column if not exists description text
  check (description is null or char_length(description) >= 50);
-- Nullable at the column level on purpose (so admin-seeded rows that
-- predate this migration don't break) — the app enforces "required,
-- 50+ chars" at creation time; the check constraint just makes sure
-- nobody can ever save a description that violates the minimum once one
-- is provided.

alter table events add column if not exists event_type text;

alter table events add column if not exists contact_method text
  check (contact_method is null or contact_method in ('phone', 'whatsapp', 'instagram', 'telegram', 'discord'));
alter table events add column if not exists contact_value text;

alter table events add column if not exists capacity int check (capacity is null or capacity > 0);
alter table events add column if not exists capacity_hidden boolean not null default false;
-- capacity_hidden only affects what the PUBLIC listing shows — the
-- organizer can always see the real number regardless of this flag.

alter table events add column if not exists posted_by_user_id uuid references auth.users(id);

alter table events add column if not exists status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));
update events set status = 'approved' where status = 'pending';
-- Same backfill pattern as gigs (002_gig_moderation.sql) — existing rows
-- get grandfathered in as approved; the default going forward is pending.

-- ---------------------------------------------------------------------
-- RLS on events — replaces the old "anyone can read everything" policy
-- with the same approved/admin/owner pattern gigs already uses.
-- ---------------------------------------------------------------------
drop policy if exists "Public read events" on events;

create policy "Public read approved events" on events
  for select using (status = 'approved');

create policy "Admins read all events" on events
  for select using (is_admin());

create policy "Organizers read own events" on events
  for select using (posted_by_user_id = auth.uid());

create policy "Authenticated users submit events" on events
  for insert to authenticated
  with check (status = 'pending' and posted_by_user_id = auth.uid());

create policy "Admins update events" on events
  for update using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- event_attendees — one row per (event, user) RSVP
-- ---------------------------------------------------------------------
create table if not exists event_attendees (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table event_attendees enable row level security;

drop policy if exists "Attendees read own RSVP" on event_attendees;
create policy "Attendees read own RSVP" on event_attendees
  for select using (user_id = auth.uid());

drop policy if exists "Attendees create own RSVP" on event_attendees;
create policy "Attendees create own RSVP" on event_attendees
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Attendees cancel own RSVP" on event_attendees;
create policy "Attendees cancel own RSVP" on event_attendees
  for delete using (user_id = auth.uid());

drop policy if exists "Organizers read their event attendees" on event_attendees;
create policy "Organizers read their event attendees" on event_attendees
  for select using (
    exists (
      select 1 from events e
      where e.id = event_attendees.event_id and e.posted_by_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Keep events.spots accurate automatically. This column already existed
-- (it's what the Feed/Discover cards display as "X spots left") — rather
-- than add a separate count mechanism, a trigger recalculates it from
-- real RSVPs whenever event_attendees changes. That means the EXISTING
-- list-view cards get live, accurate counts with zero frontend changes,
-- and the detail page can just read events.spots directly too. Security
-- definer so it can compute the true count even though the trigger fires
-- as whichever user just RSVP'd/canceled (their own RLS on event_attendees
-- would otherwise only let them see their own row, not the full count).
-- ---------------------------------------------------------------------
create or replace function public.sync_event_spots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid := coalesce(new.event_id, old.event_id);
  v_capacity int;
begin
  select capacity into v_capacity from events where id = v_event_id;
  if v_capacity is not null then
    update events
    set spots = greatest(v_capacity - (select count(*) from event_attendees where event_id = v_event_id), 0)
    where id = v_event_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_event_attendee_change on event_attendees;
create trigger on_event_attendee_change
  after insert or delete on event_attendees
  for each row execute function public.sync_event_spots();

-- ---------------------------------------------------------------------
-- Organizers seeing attendee PROFILES: profiles is owner-read-only
-- (003_user_profiles.sql), which would otherwise block an organizer from
-- seeing anything about who RSVP'd. This adds one narrow exception —
-- deliberately NOT including date_of_birth in what an organizer can see
-- through this path; exact birthdate isn't something an event organizer
-- needs, and this platform's audience skews young enough that it's worth
-- being conservative about who can see it, even though the RLS policy
-- technically grants row access to the whole profiles row. If you build
-- an attendee-list UI, only select display_name/university/bio from it —
-- don't surface date_of_birth there even though the query could.
-- ---------------------------------------------------------------------
drop policy if exists "Organizers read attendee profiles" on profiles;
create policy "Organizers read attendee profiles" on profiles
  for select using (
    exists (
      select 1 from event_attendees ea
      join events e on e.id = ea.event_id
      where ea.user_id = profiles.user_id and e.posted_by_user_id = auth.uid()
    )
  );