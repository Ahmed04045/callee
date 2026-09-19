-- supabase/migrations/010_private_clubs_usernames.sql
-- Run in the Supabase SQL Editor AFTER 009_clubs.sql. Safe to re-run.
--
--   1. Usernames (unique handle, shareable public profile, privacy toggle)
--   2. Private clubs: request-to-join + moderator approval (no more free joining)
--   3. User-created groups (Create tab), pending until an admin approves
--   4. Location columns for events/gigs (Google Places picker)
--   5. Optional cleanup of the original mock/seed rows (commented out)

-- =====================================================================
-- 1. Usernames
-- =====================================================================
alter table profiles add column if not exists username text;
alter table profiles add column if not exists is_public boolean not null default true;

alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');
create unique index if not exists profiles_username_unique on profiles (username) where username is not null;

create or replace function public.is_reserved_username(p_username text) returns boolean
language sql immutable as $$
  select lower(p_username) = any (array[
    'admin','administrator','root','support','help','moderator','mod','staff','official','system',
    'povolum','circosodal','nosuits','settings','profile','account','api','null','undefined','me'
  ])
$$;

create or replace function public.enforce_username_rules() returns trigger
language plpgsql as $$
begin
  if new.username is not null
     and (tg_op = 'INSERT' or new.username is distinct from old.username)
     and public.is_reserved_username(new.username)
     and not public.is_admin() then
    raise exception 'USERNAME_RESERVED';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enforce_username_rules on profiles;
create trigger trg_enforce_username_rules before insert or update on profiles
  for each row execute function public.enforce_username_rules();

-- true when the name is well-formed, not reserved, and free (or already yours)
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_username ~ '^[a-z0-9_]{3,20}$'
     and not public.is_reserved_username(p_username)
     and not exists (select 1 from profiles where username = p_username and user_id is distinct from auth.uid())
$$;
revoke all on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

-- Public profile for /u/:username. Returns ONLY safe columns (never email,
-- date_of_birth, or memberships) and nothing at all for private profiles.
create or replace function public.get_public_profile(p_username text)
returns table (username text, display_name text, avatar_url text, bio text, university text, account_type text)
language sql stable security definer set search_path = public as $$
  select p.username, p.display_name, p.avatar_url, p.bio, p.university, p.account_type
  from profiles p where p.username = lower(p_username) and p.is_public
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- =====================================================================
-- 2. Private clubs: request to join
-- =====================================================================
alter table clubs add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));
alter table clubs add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table clubs add column if not exists university text;
alter table clubs add column if not exists place_id text;
alter table clubs add column if not exists lat double precision;
alter table clubs add column if not exists lng double precision;
update clubs set university = 'University of Doha for Science and Technology (UDST)' where university is null;
create index if not exists idx_clubs_university on clubs (university);

-- Existing rows stay approved (default); new user-made groups start pending.
drop policy if exists "Public read clubs" on clubs;
drop policy if exists "Public read approved clubs" on clubs;
create policy "Public read approved clubs" on clubs for select using (status = 'approved');
drop policy if exists "Owners read own clubs" on clubs;
create policy "Owners read own clubs" on clubs for select to authenticated using (owner_user_id = auth.uid());

-- Column grants: the WhatsApp/Discord link columns stay hidden (see 009).
revoke select on clubs from anon, authenticated;
grant select (id, name, university_id, university_name, university, description, member_count, category,
              banner_gradient_start, banner_gradient_end, meeting_schedule, room_or_location,
              status, owner_user_id, place_id, lat, lng, created_at)
  on clubs to anon, authenticated;

-- new audit actions
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.club_audit_logs'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%JOINED%'
  loop
    execute format('alter table club_audit_logs drop constraint %I', c.conname);
  end loop;
end $$;
alter table club_audit_logs add constraint club_audit_logs_action_check
  check (action in ('JOINED','LEFT','REMOVED_BY_MOD','MOD_ASSIGNED','MOD_REMOVED','JOIN_REQUESTED','JOIN_DECLINED','GROUP_APPROVED','GROUP_REJECTED'));

create table if not exists club_join_requests (
  id uuid primary key default uuid_generate_v4(),
  club_id text not null references clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text check (message is null or char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  unique (club_id, user_id)
);
create index if not exists idx_join_requests_club on club_join_requests (club_id, status);

alter table club_join_requests enable row level security;
drop policy if exists "Read own or managed join requests" on club_join_requests;
create policy "Read own or managed join requests" on club_join_requests for select to authenticated
  using (user_id = auth.uid() or is_admin() or is_club_mod(club_id));
revoke insert, update, delete on club_join_requests from anon, authenticated;
revoke all on club_join_requests from anon;

-- Returns 'OK' | 'NOT_AUTHENTICATED' | 'NOT_FOUND' | 'ALREADY_MEMBER' | 'ALREADY_REQUESTED' | 'LIMIT_REACHED'
create or replace function public.request_join_club(p_club_id text, p_message text default '') returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_club clubs; v_req club_join_requests;
begin
  if v_uid is null then return 'NOT_AUTHENTICATED'; end if;
  select * into v_club from clubs where id = p_club_id and status = 'approved';
  if not found then return 'NOT_FOUND'; end if;
  if exists (select 1 from club_memberships where user_id = v_uid and club_id = p_club_id) then return 'ALREADY_MEMBER'; end if;
  if (select count(*) from club_memberships where user_id = v_uid) >= 5 then return 'LIMIT_REACHED'; end if;
  select * into v_req from club_join_requests where club_id = p_club_id and user_id = v_uid;
  if found and v_req.status = 'pending' then return 'ALREADY_REQUESTED'; end if;

  insert into club_join_requests (club_id, user_id, message, status)
  values (p_club_id, v_uid, nullif(left(coalesce(p_message, ''), 300), ''), 'pending')
  on conflict (club_id, user_id) do update
    set status = 'pending', message = excluded.message, created_at = now(), reviewed_by = null, reviewed_at = null;

  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, details)
  values (v_club.id, v_club.name, v_uid, club_display_name(v_uid), (select email from profiles where user_id = v_uid),
          'JOIN_REQUESTED', 'Requested to join');
  return 'OK';
end;
$$;

create or replace function public.cancel_join_request(p_club_id text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from club_join_requests where club_id = p_club_id and user_id = auth.uid() and status = 'pending';
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Admin or that club's moderator. Returns 'OK' | 'NOT_FOUND' | 'ALREADY_REVIEWED' | 'USER_AT_LIMIT'
create or replace function public.review_join_request(p_request_id uuid, p_approve boolean) returns text
language plpgsql security definer set search_path = public as $$
declare v_req club_join_requests; v_club clubs; v_uid uuid := auth.uid();
begin
  select * into v_req from club_join_requests where id = p_request_id for update;
  if not found then return 'NOT_FOUND'; end if;
  if not (public.is_admin() or public.is_club_mod(v_req.club_id)) then raise exception 'FORBIDDEN'; end if;
  if v_req.status <> 'pending' then return 'ALREADY_REVIEWED'; end if;
  select * into v_club from clubs where id = v_req.club_id;

  if p_approve then
    if (select count(*) from club_memberships where user_id = v_req.user_id) >= 5 then return 'USER_AT_LIMIT'; end if;
    insert into club_memberships (user_id, club_id) values (v_req.user_id, v_req.club_id) on conflict do nothing;
    update club_join_requests set status = 'approved', reviewed_by = v_uid, reviewed_at = now() where id = v_req.id;
    insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, actor_id, actor_name, details)
    values (v_club.id, v_club.name, v_req.user_id, club_display_name(v_req.user_id),
            (select email from profiles where user_id = v_req.user_id), 'JOINED', v_uid, club_display_name(v_uid),
            'Join request approved');
  else
    update club_join_requests set status = 'declined', reviewed_by = v_uid, reviewed_at = now() where id = v_req.id;
    insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, actor_id, actor_name, details)
    values (v_club.id, v_club.name, v_req.user_id, club_display_name(v_req.user_id),
            (select email from profiles where user_id = v_req.user_id), 'JOIN_DECLINED', v_uid, club_display_name(v_uid),
            'Join request declined');
  end if;
  return 'OK';
end;
$$;

revoke all on function public.request_join_club(text, text), public.cancel_join_request(text),
  public.review_join_request(uuid, boolean) from public, anon;
grant execute on function public.request_join_club(text, text), public.cancel_join_request(text),
  public.review_join_request(uuid, boolean) to authenticated;

-- Clubs are private now: nobody can self-join. (join_club stays defined but is no longer callable by clients.)
revoke execute on function public.join_club(text) from authenticated;

-- =====================================================================
-- 3. User-created groups (Create tab)
-- =====================================================================
-- Returns the new club id. Lands as status='pending' until an admin approves it.
create or replace function public.create_group(
  p_name text, p_description text, p_category text, p_university text,
  p_whatsapp_link text default '', p_discord_link text default '',
  p_meeting_schedule text default null, p_location text default null,
  p_place_id text default null, p_lat double precision default null, p_lng double precision default null
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
                     meeting_schedule, room_or_location, place_id, lat, lng, status, owner_user_id)
  values (v_id, trim(p_name), 'user', left(trim(p_university), 60), trim(p_university), trim(p_description), trim(p_category),
          v_pairs[v_pick][1], v_pairs[v_pick][2], v_wa, v_dc,
          coalesce(nullif(trim(p_meeting_schedule), ''), 'To be announced'),
          coalesce(nullif(trim(p_location), ''), 'To be announced'),
          p_place_id, p_lat, p_lng, 'pending', v_uid);
  return v_id;
end;
$$;

-- Admin approval. On approve, the owner becomes the group's moderator and first member.
create or replace function public.review_group(p_club_id text, p_approve boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_club clubs; v_uid uuid := auth.uid();
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_club from clubs where id = p_club_id and status = 'pending' for update;
  if not found then return false; end if;

  update clubs set status = case when p_approve then 'approved' else 'rejected' end where id = p_club_id;

  if p_approve and v_club.owner_user_id is not null then
    insert into club_moderators (club_id, user_id) values (p_club_id, v_club.owner_user_id) on conflict do nothing;
    insert into club_memberships (user_id, club_id) values (v_club.owner_user_id, p_club_id) on conflict do nothing;
  end if;

  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, actor_id, actor_name, details)
  values (v_club.id, v_club.name, v_club.owner_user_id, club_display_name(v_club.owner_user_id),
          (select email from profiles where user_id = v_club.owner_user_id),
          case when p_approve then 'GROUP_APPROVED' else 'GROUP_REJECTED' end,
          v_uid, club_display_name(v_uid), case when p_approve then 'Group approved' else 'Group rejected' end);
  return true;
end;
$$;

revoke all on function public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision),
  public.review_group(text, boolean) from public, anon;
grant execute on function public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision),
  public.review_group(text, boolean) to authenticated;

-- =====================================================================
-- 4. Location columns (Google Places picker in Create)
-- =====================================================================
alter table events add column if not exists place_id text;
alter table events add column if not exists start_time time;
alter table gigs add column if not exists location text;
alter table gigs add column if not exists place_id text;
alter table gigs add column if not exists lat double precision;
alter table gigs add column if not exists lng double precision;
alter table gigs add column if not exists is_remote boolean not null default false;

-- =====================================================================
-- 5. OPTIONAL: remove the original mock rows from schema.sql.
--    Uncomment and run ONLY if you want the site to start clean.
-- =====================================================================
-- delete from events where organizer in ('Digital Innovators Hub', 'Raw Collective');
-- delete from gigs where posted_by in ('Nexus Startup Labs', 'Volt Energy Drink Partner', 'Ghost Thread Co.') and posted_by_user_id is null;
-- delete from announcements where author in ('Captee Core Team', 'Local Desk');
