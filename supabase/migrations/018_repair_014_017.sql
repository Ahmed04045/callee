-- supabase/migrations/018_repair_014_017.sql
-- Run after 017 (or in place of re-running 014/015/016/017 by hand).
--
-- 014 and 017 both reshape get_public_profile()'s return columns, which
-- Postgres won't let CREATE OR REPLACE do (error 42P13 — needs DROP
-- FUNCTION first). The original 014/017 files are fixed now too, but if
-- you already hit this mid-way through running them by hand, your database
-- may have ended up with an inconsistent mix of 014/015/016/017 applied.
--
-- Every statement below is safe regardless of what already landed: add
-- column if not exists, create table if not exists, or drop-then-create
-- for anything that can't use "or replace" safely. Safe to run more than
-- once, and safe on a database where 014-017 already applied cleanly.

-- ---------------------------------------------------------------------
-- 014: career_entries
-- ---------------------------------------------------------------------
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
grant select on career_entries to anon;

-- ---------------------------------------------------------------------
-- 014/017: profiles columns — aura is skipped entirely (017 drops it
-- straight after), everything else 014 added stays.
-- ---------------------------------------------------------------------
alter table profiles add column if not exists profile_views int not null default 0;
alter table profiles add column if not exists looking_for text[] not null default '{}';

-- Clean up any partial "aura" leftovers from a previous 014 attempt.
drop trigger if exists on_career_entry_change on career_entries;
drop function if exists public.sync_career_aura();
alter table profiles drop column if exists aura;

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

-- ---------------------------------------------------------------------
-- 015: gig/event/club fields + create_group()'s 12th argument
-- ---------------------------------------------------------------------
alter table gigs add column if not exists commitment text
  check (commitment is null or commitment in ('One-time', 'A few days', 'A few weeks', 'A few months', 'Ongoing'));

alter table events add column if not exists is_free boolean not null default true;
alter table events add column if not exists price text check (price is null or char_length(price) <= 40);

alter table clubs add column if not exists who_can_join text check (who_can_join is null or char_length(who_can_join) <= 140);
grant select (who_can_join) on clubs to anon, authenticated;

drop function if exists public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision);
create or replace function public.create_group(
  p_name text, p_description text, p_category text, p_university text,
  p_whatsapp_link text default '', p_discord_link text default '',
  p_meeting_schedule text default null, p_location text default null,
  p_place_id text default null, p_lat double precision default null, p_lng double precision default null,
  p_who_can_join text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id text;
  v_pairs bigint[][] := array[
    [4287243143, 4293476439], [4294915375, 4282463091], [4281740879, 4283113903], [4294922031, 4292486262],
    [4279253390, 4281680509], [4283282203, 4289398883], [4284959139, 4293045958], [4294193515, 4293351811]
  ];
  v_pick int := 1 + floor(random() * 8)::int;
  v_wa text := trim(coalesce(p_whatsapp_link, ''));
  v_dc text := trim(coalesce(p_discord_link, ''));
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(trim(p_name)) not between 3 and 60 then raise exception 'BAD_NAME'; end if;
  if char_length(trim(p_description)) < 50 then raise exception 'DESCRIPTION_TOO_SHORT'; end if;
  if coalesce(trim(p_category), '') = '' or coalesce(trim(p_university), '') = '' then raise exception 'MISSING_FIELDS'; end if;
  if v_wa = '' and v_dc = '' then raise exception 'LINK_REQUIRED'; end if;
  if v_wa <> '' and v_wa !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+' then raise exception 'BAD_WHATSAPP_LINK'; end if;
  if v_dc <> '' and v_dc !~ '^https://(discord\.gg|discord\.com/invite)/[A-Za-z0-9_-]+' then raise exception 'BAD_DISCORD_LINK'; end if;
  if (select count(*) from clubs where owner_user_id = v_uid and status = 'pending') >= 3 then raise exception 'TOO_MANY_PENDING'; end if;

  v_id := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 4);

  insert into clubs (id, name, university_id, university_name, university, description, category,
                     banner_gradient_start, banner_gradient_end, whatsapp_link, discord_link,
                     meeting_schedule, room_or_location, place_id, lat, lng, status, owner_user_id, who_can_join)
  values (v_id, trim(p_name), 'user', left(trim(p_university), 60), trim(p_university), trim(p_description), trim(p_category),
          v_pairs[v_pick][1], v_pairs[v_pick][2], v_wa, v_dc,
          coalesce(nullif(trim(p_meeting_schedule), ''), 'To be announced'),
          coalesce(nullif(trim(p_location), ''), 'To be announced'),
          p_place_id, p_lat, p_lng, 'pending', v_uid, nullif(trim(p_who_can_join), ''));
  return v_id;
end;
$$;

revoke all on function public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision, text) from public, anon;
grant execute on function public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision, text) to authenticated;

-- ---------------------------------------------------------------------
-- 016: gig cover photo, club banner photo
-- ---------------------------------------------------------------------
alter table gigs add column if not exists cover_image_url text;
alter table clubs add column if not exists banner_image_url text;
grant select (banner_image_url) on clubs to anon, authenticated;

insert into storage.buckets (id, name, public) values ('gig-photos', 'gig-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('club-photos', 'club-photos', true) on conflict (id) do nothing;

drop policy if exists "Posters manage own gig photos" on storage.objects;
create policy "Posters manage own gig photos" on storage.objects
  for all
  using (bucket_id = 'gig-photos' and exists (select 1 from gigs g where g.id::text = (storage.foldername(name))[1] and g.posted_by_user_id = auth.uid()))
  with check (bucket_id = 'gig-photos' and exists (select 1 from gigs g where g.id::text = (storage.foldername(name))[1] and g.posted_by_user_id = auth.uid()));

drop policy if exists "Owners manage own club banner" on storage.objects;
create policy "Owners manage own club banner" on storage.objects
  for all
  using (bucket_id = 'club-photos' and exists (select 1 from clubs c where c.id = (storage.foldername(name))[1] and c.owner_user_id = auth.uid()))
  with check (bucket_id = 'club-photos' and exists (select 1 from clubs c where c.id = (storage.foldername(name))[1] and c.owner_user_id = auth.uid()));

create or replace function public.set_gig_cover_image(p_gig_id uuid, p_url text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update gigs set cover_image_url = p_url where id = p_gig_id and posted_by_user_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.set_gig_cover_image(uuid, text) from public, anon;
grant execute on function public.set_gig_cover_image(uuid, text) to authenticated;

create or replace function public.set_club_banner_image(p_club_id text, p_url text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update clubs set banner_image_url = p_url where id = p_club_id and owner_user_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.set_club_banner_image(text, text) from public, anon;
grant execute on function public.set_club_banner_image(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 017: identity word columns
-- ---------------------------------------------------------------------
alter table profiles add column if not exists identity_word text check (identity_word is null or char_length(identity_word) <= 40);
alter table profiles add column if not exists identity_word_reason text check (identity_word_reason is null or char_length(identity_word_reason) <= 600);

-- Final, correct shape of get_public_profile() — defined exactly once here,
-- after every column it needs already exists.
drop function if exists public.get_public_profile(text);
create or replace function public.get_public_profile(p_username text)
returns table (
  username text, display_name text, avatar_url text, bio text, university text, account_type text,
  profile_views int, looking_for text[], identity_word text, identity_word_reason text
)
language sql stable security definer set search_path = public as $$
  select p.username, p.display_name, p.avatar_url, p.bio, p.university, p.account_type,
    p.profile_views, p.looking_for, p.identity_word, p.identity_word_reason
  from profiles p where p.username = lower(p_username) and p.is_public
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Sanity check — run this after the block above and confirm all 7 columns
-- read `true`.
-- ---------------------------------------------------------------------
select
  exists (select 1 from information_schema.columns where table_name = 'clubs' and column_name = 'who_can_join') as clubs_who_can_join,
  exists (select 1 from information_schema.columns where table_name = 'clubs' and column_name = 'banner_image_url') as clubs_banner_image_url,
  exists (select 1 from information_schema.columns where table_name = 'gigs' and column_name = 'cover_image_url') as gigs_cover_image_url,
  exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'identity_word') as profiles_identity_word,
  not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'aura') as aura_is_gone,
  exists (select 1 from information_schema.tables where table_name = 'career_entries') as career_entries_exists,
  (select count(*) from pg_proc where proname = 'get_public_profile') = 1 as get_public_profile_has_one_version;
