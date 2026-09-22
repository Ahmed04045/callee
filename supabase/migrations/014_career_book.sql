-- supabase/migrations/014_career_book.sql
-- Run after 013.
--
-- Career Book: structured proof-of-work entries on a personal profile —
-- projects, experience/internships, achievements, competitions, leadership
-- and milestones — plus three light profile-completeness signals that show
-- on the profile: an "aura" score (10 points per entry, kept in sync by a
-- trigger so nothing has to recompute it on every page load), a profile
-- view counter, and a stated "looking for" list of gig tags (reuses the
-- same tag vocabulary gigs already use, see src/lib/options.js GIG_TAGS).
--
-- The people who actually read a Career Book are gig/event posters
-- deciding on an applicant (ApplicantsView already shows the rest of a
-- profile) — this is not a separate company-facing product, just more of
-- what a poster already sees.

-- =====================================================================
-- 1. career_entries
-- =====================================================================
create table if not exists career_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('project', 'experience', 'achievement', 'competition', 'leadership', 'milestone')),
  title text not null check (char_length(title) between 3 and 100),
  organization text check (organization is null or char_length(organization) <= 100),
  role text check (role is null or char_length(role) <= 100),
  description text check (description is null or char_length(description) <= 1000),
  link text check (link is null or char_length(link) <= 300),
  start_date date,
  end_date date,
  is_ongoing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_career_entries_user on career_entries (user_id, created_at desc);

alter table career_entries enable row level security;

drop policy if exists "Read entries of public or own profiles" on career_entries;
create policy "Read entries of public or own profiles" on career_entries
  for select using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.user_id = career_entries.user_id and p.is_public)
  );

drop policy if exists "Manage own entries" on career_entries;
create policy "Manage own entries" on career_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on career_entries from anon;
grant select, insert, update, delete on career_entries to authenticated;
grant select on career_entries to anon; -- RLS above still restricts this to public profiles only

-- =====================================================================
-- 2. profiles: aura, profile_views, looking_for
-- =====================================================================
alter table profiles add column if not exists aura int not null default 0;
alter table profiles add column if not exists profile_views int not null default 0;
alter table profiles add column if not exists looking_for text[] not null default '{}';

create or replace function public.sync_career_aura() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := coalesce(new.user_id, old.user_id);
begin
  update profiles set aura = (select count(*) * 10 from career_entries where user_id = v_uid) where user_id = v_uid;
  return null;
end;
$$;

drop trigger if exists on_career_entry_change on career_entries;
create trigger on_career_entry_change
  after insert or delete on career_entries
  for each row execute function public.sync_career_aura();

-- =====================================================================
-- 3. Profile views — counted once per visit, never for your own profile.
-- =====================================================================
create or replace function public.record_profile_view(p_username text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  select user_id into v_uid from profiles where username = lower(p_username) and is_public;
  if v_uid is not null and v_uid <> auth.uid() then
    update profiles set profile_views = profile_views + 1 where user_id = v_uid;
  end if;
end;
$$;
revoke all on function public.record_profile_view(text) from public;
grant execute on function public.record_profile_view(text) to anon, authenticated;

-- =====================================================================
-- 4. get_public_profile() (010) needs the three new fields too. Postgres
-- won't let CREATE OR REPLACE change a RETURNS TABLE's column list (same
-- issue as create_group() in 015 — see that migration's comment) — drop
-- the old shape first.
-- =====================================================================
drop function if exists public.get_public_profile(text);
create or replace function public.get_public_profile(p_username text)
returns table (username text, display_name text, avatar_url text, bio text, university text, account_type text, aura int, profile_views int, looking_for text[])
language sql stable security definer set search_path = public as $$
  select p.username, p.display_name, p.avatar_url, p.bio, p.university, p.account_type, p.aura, p.profile_views, p.looking_for
  from profiles p where p.username = lower(p_username) and p.is_public
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- =====================================================================
-- 5. A public profile page only has a username, never a user_id (see
-- get_public_profile's comment above about never returning one) — this
-- does the username -> entries join server-side so the client still never
-- sees the id.
-- =====================================================================
create or replace function public.get_public_career_entries(p_username text)
returns table (
  id uuid, kind text, title text, organization text, role text, description text,
  link text, start_date date, end_date date, is_ongoing boolean, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select ce.id, ce.kind, ce.title, ce.organization, ce.role, ce.description,
    ce.link, ce.start_date, ce.end_date, ce.is_ongoing, ce.created_at
  from career_entries ce
  join profiles p on p.user_id = ce.user_id
  where p.username = lower(p_username) and p.is_public
  order by ce.created_at desc
$$;
revoke all on function public.get_public_career_entries(text) from public;
grant execute on function public.get_public_career_entries(text) to anon, authenticated;
