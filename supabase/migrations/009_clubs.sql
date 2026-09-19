-- supabase/migrations/009_clubs.sql
-- Run in the Supabase SQL Editor after 007 (and after 008 if you use the Discord bot).
--
-- Adds Circosodal (university clubs) to the SAME database/auth as the rest
-- of the site:
--   * People are auth.users + profiles (no separate "users" table).
--   * Site admin = the existing app_admins / is_admin() (unchanged).
--   * Club moderators = rows in club_moderators (per club).
--   * All club writes (join / leave / remove member / moderators) go through
--     SECURITY DEFINER functions; clients only get SELECT.
--   * WhatsApp/Discord links are hidden from the clubs table and only served
--     by get_club_links() to members, that club's moderators and admins.
--
-- This file does NOT redefine is_admin() or the on_auth_user_created trigger
-- name; it only extends handle_new_user() (adds email + moderator invites).
-- Safe to re-run.

-- ---------------------------------------------------------------------
-- 0. profiles: email (needed so moderators/admins can find people)
-- ---------------------------------------------------------------------
alter table profiles add column if not exists email text;
update profiles p set email = lower(u.email) from auth.users u where u.id = p.user_id and p.email is null;
create index if not exists idx_profiles_email on profiles (lower(email));

-- Users can edit their own profile, but never the email copy.
create or replace function public.protect_profile_email() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and current_user not in ('postgres', 'supabase_admin') then
    new.email := old.email;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile_email on profiles;
create trigger trg_protect_profile_email before update on profiles
  for each row execute function public.protect_profile_email();

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists clubs (
  id text primary key,
  name text not null,
  university_id text not null default 'udst',
  university_name text not null default 'UDST',
  description text not null,
  member_count int not null default 0 check (member_count >= 0),
  category text not null,
  banner_gradient_start bigint not null,   -- 0xAARRGGBB, same as the Android app
  banner_gradient_end bigint not null,
  whatsapp_link text not null,
  discord_link text not null,
  meeting_schedule text default 'Weekly Meetings & Community Events',
  room_or_location text default 'UDST Student Center',
  created_at timestamptz not null default now()
);

create table if not exists club_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id text not null references clubs(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, club_id)
);
create index if not exists idx_club_memberships_club on club_memberships (club_id);

create table if not exists club_moderators (
  club_id text not null references clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index if not exists idx_club_moderators_user on club_moderators (user_id);

-- Moderator invitations for people who haven't registered yet.
create table if not exists club_moderator_invites (
  club_id text not null references clubs(id) on delete cascade,
  email text not null,
  invited_at timestamptz not null default now(),
  primary key (club_id, email)
);

create table if not exists club_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  club_id text not null references clubs(id) on delete cascade,
  club_name text not null,
  user_id uuid,
  user_name text not null,
  user_email text,
  action text not null check (action in ('JOINED', 'LEFT', 'REMOVED_BY_MOD', 'MOD_ASSIGNED', 'MOD_REMOVED')),
  actor_id uuid,
  actor_name text,
  details text default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_club_audit_logs_club on club_audit_logs (club_id, created_at desc);

create table if not exists club_news (
  id text primary key,
  club_id text not null references clubs(id) on delete cascade,
  title text not null,
  summary text not null,
  content text not null,
  date_label text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Helpers / triggers
-- ---------------------------------------------------------------------
create or replace function public.is_club_mod(p_club_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_moderators where club_id = p_club_id and user_id = auth.uid())
$$;

-- Keep clubs.member_count exact.
create or replace function public.sync_club_member_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_club text := coalesce(new.club_id, old.club_id);
begin
  update clubs set member_count = (select count(*) from club_memberships where club_id = v_club) where id = v_club;
  return null;
end;
$$;
drop trigger if exists trg_sync_club_member_count on club_memberships;
create trigger trg_sync_club_member_count after insert or delete on club_memberships
  for each row execute function public.sync_club_member_count();

-- Max 5 clubs per person, enforced by the database too.
create or replace function public.enforce_club_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from club_memberships where user_id = new.user_id) >= 5 then
    raise exception 'LIMIT_REACHED';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enforce_club_limit on club_memberships;
create trigger trg_enforce_club_limit before insert on club_memberships
  for each row execute function public.enforce_club_limit();

-- Extend the existing signup trigger function (003): also store the email and
-- turn pending moderator invites into real assignments.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email) values (new.id, lower(new.email))
  on conflict (user_id) do update set email = coalesce(public.profiles.email, excluded.email);

  insert into public.club_moderators (club_id, user_id)
  select i.club_id, new.id from public.club_moderator_invites i where lower(i.email) = lower(new.email)
  on conflict do nothing;
  delete from public.club_moderator_invites where lower(email) = lower(new.email);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Functions (all writes)
-- ---------------------------------------------------------------------
create or replace function public.club_display_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(display_name, ''), split_part(email, '@', 1), 'Student') from profiles where user_id = p_user
$$;

-- Returns 'OK' | 'LIMIT_REACHED' | 'ALREADY_MEMBER' | 'NOT_AUTHENTICATED' | 'NOT_FOUND'
create or replace function public.join_club(p_club_id text) returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_club clubs;
begin
  if v_uid is null then return 'NOT_AUTHENTICATED'; end if;
  select * into v_club from clubs where id = p_club_id;
  if not found then return 'NOT_FOUND'; end if;
  if exists (select 1 from club_memberships where user_id = v_uid and club_id = p_club_id) then return 'ALREADY_MEMBER'; end if;
  if (select count(*) from club_memberships where user_id = v_uid) >= 5 then return 'LIMIT_REACHED'; end if;

  insert into club_memberships (user_id, club_id) values (v_uid, p_club_id);
  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, details)
  values (v_club.id, v_club.name, v_uid, club_display_name(v_uid), (select email from profiles where user_id = v_uid), 'JOINED', 'Joined club');
  return 'OK';
end;
$$;

create or replace function public.leave_club(p_club_id text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); n int; v_club clubs;
begin
  if v_uid is null then return false; end if;
  delete from club_memberships where user_id = v_uid and club_id = p_club_id;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  select * into v_club from clubs where id = p_club_id;
  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, details)
  values (p_club_id, coalesce(v_club.name, p_club_id), v_uid, club_display_name(v_uid), (select email from profiles where user_id = v_uid), 'LEFT', 'Left club voluntarily');
  return true;
end;
$$;

create or replace function public.remove_club_member(p_club_id text, p_user_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); n int; v_club clubs;
begin
  if v_uid is null or not (public.is_admin() or public.is_club_mod(p_club_id)) then raise exception 'FORBIDDEN'; end if;
  delete from club_memberships where user_id = p_user_id and club_id = p_club_id;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  select * into v_club from clubs where id = p_club_id;
  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, actor_id, actor_name, details)
  values (p_club_id, coalesce(v_club.name, p_club_id), p_user_id, club_display_name(p_user_id),
          (select email from profiles where user_id = p_user_id), 'REMOVED_BY_MOD', v_uid, club_display_name(v_uid),
          'Removed from club by ' || club_display_name(v_uid));
  return true;
end;
$$;

-- p_identifier: a user id (uuid text) or an email. Unregistered emails become invitations.
create or replace function public.assign_club_moderator(p_club_id text, p_identifier text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_club clubs; v_target profiles; v_ident text := trim(p_identifier);
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_club from clubs where id = p_club_id;
  if not found then return false; end if;
  select * into v_target from profiles
    where lower(email) = lower(v_ident) or user_id::text = v_ident limit 1;
  if not found then
    if position('@' in v_ident) = 0 then return false; end if;
    insert into club_moderator_invites (club_id, email) values (p_club_id, lower(v_ident)) on conflict do nothing;
    return true;
  end if;
  insert into club_moderators (club_id, user_id) values (p_club_id, v_target.user_id) on conflict do nothing;
  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, actor_id, actor_name, details)
  values (v_club.id, v_club.name, v_target.user_id, club_display_name(v_target.user_id), v_target.email, 'MOD_ASSIGNED',
          auth.uid(), club_display_name(auth.uid()), 'Assigned as club moderator by an admin');
  return true;
end;
$$;

create or replace function public.remove_club_moderator(p_club_id text, p_user_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_club clubs; n int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  delete from club_moderators where club_id = p_club_id and user_id = p_user_id;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  select * into v_club from clubs where id = p_club_id;
  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, actor_id, actor_name, details)
  values (p_club_id, coalesce(v_club.name, p_club_id), p_user_id, club_display_name(p_user_id),
          (select email from profiles where user_id = p_user_id), 'MOD_REMOVED', auth.uid(), club_display_name(auth.uid()),
          'Moderator privileges revoked by an admin');
  return true;
end;
$$;

create or replace function public.get_club_links(p_club_id text)
returns table (whatsapp_link text, discord_link text)
language sql stable security definer set search_path = public as $$
  select c.whatsapp_link, c.discord_link from clubs c
  where c.id = p_club_id and (
    public.is_admin() or public.is_club_mod(c.id)
    or exists (select 1 from club_memberships m where m.club_id = c.id and m.user_id = auth.uid())
  )
$$;

revoke all on function public.join_club(text), public.leave_club(text), public.remove_club_member(text, uuid),
  public.assign_club_moderator(text, text), public.remove_club_moderator(text, uuid), public.get_club_links(text),
  public.is_club_mod(text), public.club_display_name(uuid) from public, anon;
grant execute on function public.join_club(text), public.leave_club(text), public.remove_club_member(text, uuid),
  public.assign_club_moderator(text, text), public.remove_club_moderator(text, uuid), public.get_club_links(text),
  public.is_club_mod(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------
alter table clubs enable row level security;
alter table club_memberships enable row level security;
alter table club_moderators enable row level security;
alter table club_moderator_invites enable row level security;
alter table club_audit_logs enable row level security;
alter table club_news enable row level security;

drop policy if exists "Public read clubs" on clubs;
create policy "Public read clubs" on clubs for select using (true);
drop policy if exists "Admins manage clubs" on clubs;
create policy "Admins manage clubs" on clubs for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "Public read club news" on club_news;
create policy "Public read club news" on club_news for select using (true);
drop policy if exists "Admins and club mods manage club news" on club_news;
create policy "Admins and club mods manage club news" on club_news for all to authenticated
  using (is_admin() or is_club_mod(club_id)) with check (is_admin() or is_club_mod(club_id));

drop policy if exists "Read own or managed memberships" on club_memberships;
create policy "Read own or managed memberships" on club_memberships for select to authenticated
  using (user_id = auth.uid() or is_admin() or is_club_mod(club_id));

drop policy if exists "Read own or managed moderators" on club_moderators;
create policy "Read own or managed moderators" on club_moderators for select to authenticated
  using (user_id = auth.uid() or is_admin() or is_club_mod(club_id));

drop policy if exists "Admins read moderator invites" on club_moderator_invites;
create policy "Admins read moderator invites" on club_moderator_invites for select to authenticated using (is_admin());

drop policy if exists "Admins and club mods read logs" on club_audit_logs;
create policy "Admins and club mods read logs" on club_audit_logs for select to authenticated
  using (is_admin() or is_club_mod(club_id));

-- profiles: admins see everyone; moderators see members of clubs they moderate.
-- (Same caveat as the organizer policy in 006: row access includes
-- date_of_birth, so UI code must only select display_name/avatar_url/email/bio.)
drop policy if exists "Admins read all profiles" on profiles;
create policy "Admins read all profiles" on profiles for select using (is_admin());
drop policy if exists "Club mods read member profiles" on profiles;
create policy "Club mods read member profiles" on profiles for select using (
  exists (select 1 from club_memberships m where m.user_id = profiles.user_id and is_club_mod(m.club_id))
);

-- Privileges: clients can only SELECT (writes are via functions above).
revoke insert, update, delete on club_memberships, club_moderators, club_moderator_invites, club_audit_logs from anon, authenticated;
revoke all on club_memberships, club_moderators, club_moderator_invites, club_audit_logs from anon;

-- Hide the member-only link columns from the clubs table.
revoke select on clubs from anon, authenticated;
grant select (id, name, university_id, university_name, description, member_count, category,
              banner_gradient_start, banner_gradient_end, meeting_schedule, room_or_location, created_at)
  on clubs to anon, authenticated;
grant insert, update, delete on clubs to authenticated;  -- still gated by the admin policy above
-- (Admins edit the two link columns from the Supabase dashboard / SQL editor.)

-- Realtime for live member counts.
do $$ begin
  begin alter publication supabase_realtime add table public.clubs; exception when others then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 5. Seed
-- ---------------------------------------------------------------------
-- Seed data (generated from the Android app InitialData.kt)
INSERT INTO public.clubs (id, name, university_id, university_name, description, category, banner_gradient_start, banner_gradient_end, whatsapp_link, discord_link, meeting_schedule, room_or_location)
VALUES
('art-club', 'Art Club', 'udst', 'UDST', 'A creative hub for canvas painting, sketching, digital illustration, calligraphy, and campus art exhibitions. Welcoming all skill levels!', 'Arts & Culture', 4287243143, 4293476439, 'https://chat.whatsapp.com/udst-art-club-invite', 'https://discord.gg/udst-art-community', 'Mondays & Wednesdays, 4:00 PM', 'Building 3, Fine Arts Studio 104'),
('boardgames-club', 'Boardgames Club', 'udst', 'UDST', 'From tactical Catan and chess tournaments to casual party games and social nights. Come de-stress and make lasting friendships.', 'Social & Gaming', 4294152271, 4282073969, 'https://chat.whatsapp.com/udst-boardgames-invite', 'https://discord.gg/udst-boardgames', 'Thursdays, 5:30 PM', 'Student Center Lounge, 2nd Floor'),
('book-club', 'Book Club', 'udst', 'UDST', 'Monthly literary reads covering fiction, science, history, and philosophy, followed by coffee sessions and lively open debates.', 'Academic & Literature', 4281089616, 4283212207, 'https://chat.whatsapp.com/udst-bookclub-invite', 'https://discord.gg/udst-bookworms', 'Bi-weekly Tuesdays, 3:30 PM', 'UDST Central Library Discussion Room A'),
('cooking-club', 'Cooking Club', 'udst', 'UDST', 'Master culinary basics, explore traditional Qatari delicacies, bake artisan pastries, and compete in the semester MasterChef showdown.', 'Lifestyle & Skills', 4294922543, 4292682870, 'https://chat.whatsapp.com/udst-cooking-invite', 'https://discord.gg/udst-culinary', 'Wednesdays, 5:00 PM', 'Student Center Culinary Lab'),
('deen-club', 'Deen Club', 'udst', 'UDST', 'Fostering spiritual growth, Islamic values, brotherhood, and community service on campus through weekly reminders, charity drives, and Halaqat.', 'Faith & Community', 4279343502, 4281921405, 'https://chat.whatsapp.com/udst-deen-invite', 'https://discord.gg/udst-deen-community', 'Sundays after Dhuhr & Tuesdays 4 PM', 'UDST Campus Mosque & Center'),
('english-debate-club', 'English Debate Club', 'udst', 'UDST', 'Sharpen critical thinking, public speaking, and parliamentary debate skills. Compete in Qatar Universities Debate League tournaments.', 'Academic & Leadership', 4280600284, 4283517597, 'https://chat.whatsapp.com/udst-debate-invite', 'https://discord.gg/udst-debate-league', 'Tuesdays & Thursdays, 4:30 PM', 'Building 6, Auditorium B'),
('environment-club', 'Environment Club', 'udst', 'UDST', 'Dedicated to sustainability in Qatar. Leading mangrove cleanups, recycling initiatives, desert greening, and eco-technology projects.', 'Service & Science', 4283869999, 4289257571, 'https://chat.whatsapp.com/udst-environment-invite', 'https://discord.gg/udst-eco-green', 'Wednesdays, 3:30 PM', 'Building 8, Sustainability Hub'),
('students-for-inclusivity', 'Students for Inclusivity', 'udst', 'UDST', 'Promoting accessibility, neurodiversity awareness, and peer support networks so every Falcon feels empowered and supported on campus.', 'Community & Support', 4284829347, 4293570504, 'https://chat.whatsapp.com/udst-inclusivity-invite', 'https://discord.gg/udst-inclusivity', 'Bi-weekly Mondays, 4:00 PM', 'Building 3, Room 210'),
('music-club', 'Music Club', 'udst', 'UDST', 'For instrumentalists, vocalists, audio engineers, and music enthusiasts. Weekly jam sessions, open mics, and stage performances.', 'Arts & Culture', 4294723179, 4282343163, 'https://chat.whatsapp.com/udst-music-invite', 'https://discord.gg/udst-music-sessions', 'Sundays & Wednesdays, 5:00 PM', 'Student Center Sound Studio'),
('al-quds-club', 'Al-Quds Club', 'udst', 'UDST', 'Cultural preservation, humanitarian awareness, poetry nights, and historical lectures celebrating Palestinian heritage and international solidarity.', 'Cultural & Heritage', 4278190080, 4278228537, 'https://chat.whatsapp.com/udst-alquds-invite', 'https://discord.gg/udst-alquds-community', 'Thursdays, 4:00 PM', 'Main Building Grand Hall'),
('photography-club', 'Photography Club', 'udst', 'UDST', 'Photowalks across Doha (Souq Waqif, Katara, Lusail), darkroom techniques, digital editing, and campus photojournalism.', 'Media & Arts', 4280238135, 4288279240, 'https://chat.whatsapp.com/udst-photo-invite', 'https://discord.gg/udst-photographers', 'Mondays 4:00 PM & Weekend Photowalks', 'Building 10, Media Lab'),
('qatar-student-association', 'Qatar Student Association', 'udst', 'UDST', 'Celebrating Qatari traditions, organizing National Day festivities, organizing heritage seminars, and supporting local student initiatives.', 'Cultural & Heritage', 4287239480, 4283960355, 'https://chat.whatsapp.com/udst-qsa-invite', 'https://discord.gg/udst-qsa', 'Tuesdays, 4:30 PM', 'Student Center Majlis Hall'),
('volunteer-club', 'Volunteer Club', 'udst', 'UDST', 'Community outreach, blood donation drives, international sports event volunteering in Doha, and charitable partnerships with Qatar Red Crescent.', 'Service & Leadership', 4293604169, 4294204483, 'https://chat.whatsapp.com/udst-volunteer-invite', 'https://discord.gg/udst-volunteers', 'Saturdays & Wednesdays', 'Building 1, Volunteer Center'),
('mun-club', 'Model United Nations (MUN)', 'udst', 'UDST', 'Diplomacy, resolution drafting, crisis committees, and international relations. Represent UDST at regional and global MUN conferences.', 'Academic & Leadership', 4278211284, 4282606839, 'https://chat.whatsapp.com/udst-mun-invite', 'https://discord.gg/udst-mun', 'Sundays, 5:00 PM', 'Building 5, Conference Room 3'),
('isa-club', 'International Student Association (ISA)', 'udst', 'UDST', 'Representing students from over 85 nationalities. Cultural festivals, buddy systems, orientation guidance, and international food fairs.', 'Cultural & Community', 4279455326, 4285641344, 'https://chat.whatsapp.com/udst-isa-invite', 'https://discord.gg/udst-international', 'Thursdays, 4:30 PM', 'Student Center International Hub'),
('fashion-club', 'Fashion Club', 'udst', 'UDST', 'Garment upcycling, modern streetwear aesthetics, textile design, runway styling, and sustainable regional fashion trends.', 'Arts & Lifestyle', 4290401136, 4294238936, 'https://chat.whatsapp.com/udst-fashion-invite', 'https://discord.gg/udst-fashion-collective', 'Mondays, 5:00 PM', 'Building 4, Design Workshop'),
('theatre-club', 'Theatre Club', 'udst', 'UDST', 'Stage acting, scriptwriting, improv comedy, stage lighting, and production. Staging two full-length campus theatrical productions yearly.', 'Arts & Performing', 4283109960, 4293968507, 'https://chat.whatsapp.com/udst-theatre-invite', 'https://discord.gg/udst-stage-theatre', 'Tuesdays & Fridays, 5:00 PM', 'Main Campus Auditorium'),
('fan-club', 'Fan Club', 'udst', 'UDST', 'Cheering on UDST Falcons in QCSF inter-university athletics! Chants, campus spirit, banner painting, and road trips to tournaments.', 'Campus Spirit', 4293730618, 4287834398, 'https://chat.whatsapp.com/udst-fanclub-invite', 'https://discord.gg/udst-falcons-fans', 'Match Days & Thursdays 3:00 PM', 'Sports Complex Stadium Entrance'),
('badminton-club', 'Badminton Club', 'udst', 'UDST', 'Casual smashes and competitive singles/doubles training. Weekly court reservations with coaching drills for beginners and advanced players.', 'Sports & Athletics', 4278364848, 4278242732, 'https://chat.whatsapp.com/udst-badminton-invite', 'https://discord.gg/udst-badminton-squad', 'Mondays & Wednesdays, 6:00 PM', 'Sports Complex Court 1 & 2'),
('billiards-club', 'Billiards Club', 'udst', 'UDST', '8-ball, 9-ball, and snooker tactical technique, cue ball control, and campus tournaments held on professional tables in the rec center.', 'Sports & Recreation', 4278792232, 4280515159, 'https://chat.whatsapp.com/udst-billiards-invite', 'https://discord.gg/udst-billiards-hall', 'Tuesdays & Thursdays, 5:00 PM', 'Recreation Center Billiards Room'),
('egaming-club', 'E-Gaming Club', 'udst', 'UDST', 'Esports teams in Valorant, League of Legends, FC25, Rocket League, and Smash Bros. LAN parties and collegiate tournaments.', 'Technology & Gaming', 4286513407, 4292935935, 'https://chat.whatsapp.com/udst-egaming-invite', 'https://discord.gg/udst-esports-arena', 'Fridays & Saturdays, 6:00 PM', 'Building 12, Esports Arena'),
('fit-club', 'Fit Club', 'udst', 'UDST', 'Group fitness circuits, HIIT, mobility workshops, nutrition advice, and wellness challenges to build healthy habits during university.', 'Health & Fitness', 4294465446, 4294924376, 'https://chat.whatsapp.com/udst-fitclub-invite', 'https://discord.gg/udst-fit-community', 'Sundays & Tuesdays, 7:00 AM & 5:00 PM', 'Sports Complex Fitness Studio'),
('martial-arts-club', 'Martial Arts Club', 'udst', 'UDST', 'Self-defense, Brazilian Jiu-Jitsu, Taekwondo, and Karate fundamentals taught by certified student and guest instructors.', 'Sports & Martial Arts', 4280287522, 4285464576, 'https://chat.whatsapp.com/udst-martialarts-invite', 'https://discord.gg/udst-dojo', 'Mondays & Thursdays, 6:30 PM', 'Sports Complex Tatami Hall'),
('running-club', 'Running Club', 'udst', 'UDST', 'Morning and sunset campus jogs, 5K training, Aspire Zone distance runs, and participating in the annual Ooredoo Doha Marathon.', 'Sports & Athletics', 4279508528, 4280564565, 'https://chat.whatsapp.com/udst-runners-invite', 'https://discord.gg/udst-running-club', 'Tuesdays 6:00 AM & Thursdays 5:30 PM', 'Sports Complex Outdoor Track'),
('wrestling-club', 'Wrestling Club', 'udst', 'UDST', 'Freestyle and Greco-Roman wrestling techniques focusing on balance, takedowns, core endurance, and collegiate athletic discipline.', 'Sports & Athletics', 4282274129, 4292791204, 'https://chat.whatsapp.com/udst-wrestling-invite', 'https://discord.gg/udst-wrestling-team', 'Wednesdays & Saturdays, 6:00 PM', 'Sports Complex Combat Arena'),
('calisthenics-club', 'Calisthenics Club', 'udst', 'UDST', 'Bodyweight mastery, muscle-ups, handstands, human flags, and progressive calisthenics training at the campus outdoor workout park.', 'Health & Fitness', 4282598211, 4278190080, 'https://chat.whatsapp.com/udst-calisthenics-invite', 'https://discord.gg/udst-calisthenics', 'Mondays & Wednesdays, 5:30 PM', 'Outdoor Pull-Up & Calisthenics Park'),
('powerlifting-club', 'Powerlifting Club', 'udst', 'UDST', 'Squat, bench press, and deadlift technique optimization, safe periodization, and coaching for local Qatar Powerlifting meets.', 'Health & Fitness', 4283133111, 4279773256, 'https://chat.whatsapp.com/udst-powerlifting-invite', 'https://discord.gg/udst-iron-lifters', 'Sundays & Thursdays, 6:00 PM', 'Sports Complex Heavy Weights Gym'),
('automotive-club', 'Automotive Club', 'udst', 'UDST', 'Automotive engineering, karting endurance races at Lusail Circuit, engine diagnostics workshops, and campus car meets.', 'Technology & Mechanical', 4292022311, 4293539917, 'https://chat.whatsapp.com/udst-auto-invite', 'https://discord.gg/udst-motorsport', 'Saturdays, 4:00 PM', 'Engineering Building Garage 1'),
('podcast-club', 'Podcast Club', 'udst', 'UDST', 'Producing ''The Falcon Voice'' student podcast, interviewing professors, campus leaders, entrepreneurs, and recording audio stories.', 'Media & Communications', 4282873574, 4287517929, 'https://chat.whatsapp.com/udst-podcast-invite', 'https://discord.gg/udst-broadcast', 'Tuesdays, 4:00 PM', 'Building 10, Acoustic Podcast Booth'),
('film-club', 'Film Club', 'udst', 'UDST', 'Cinematic screenings, screenwriting, short film production, cinematography masterclasses, and Ajyal Film Festival discussions.', 'Media & Arts', 4280493350, 4282467141, 'https://chat.whatsapp.com/udst-film-invite', 'https://discord.gg/udst-filmmakers', 'Wednesdays, 6:00 PM', 'Building 6 Cinema Screening Hall'),
('entrepreneur-club', 'Entrepreneur Club', 'udst', 'UDST', 'Startup pitching, tech venture building, hackathon teams, and networking with Qatar Science & Technology Park (QSTP) incubators.', 'Business & Innovation', 4280129388, 4287887801, 'https://chat.whatsapp.com/udst-entrepreneurs-invite', 'https://discord.gg/udst-founders', 'Sundays, 5:00 PM', 'UDST Innovation & Incubator Center'),
('astronomy-club', 'Astronomy Club', 'udst', 'UDST', 'Stargazing expeditions in the Qatar desert (Zekreet & Al-Khararra), telescope astrophotography, space science seminars, and eclipse viewings.', 'Science & Nature', 4279181351, 4280302147, 'https://chat.whatsapp.com/udst-astronomy-invite', 'https://discord.gg/udst-astronomy', 'Bi-weekly Thursdays 6:30 PM & Desert Trips', 'Building 9 Observation Roof Terrace'),
('scout-club', 'Scout Club', 'udst', 'UDST', 'Wilderness navigation, desert survival training, first aid certification, camping, leadership drills, and national scouting jamborees.', 'Leadership & Outdoors', 4284301655, 4289252026, 'https://chat.whatsapp.com/udst-scouts-invite', 'https://discord.gg/udst-scouts', 'Saturdays, 9:00 AM', 'Outdoor Field Operations Base')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
  banner_gradient_start = EXCLUDED.banner_gradient_start, banner_gradient_end = EXCLUDED.banner_gradient_end,
  whatsapp_link = EXCLUDED.whatsapp_link, discord_link = EXCLUDED.discord_link,
  meeting_schedule = EXCLUDED.meeting_schedule, room_or_location = EXCLUDED.room_or_location;

INSERT INTO public.club_news (id, club_id, title, summary, content, date_label, created_at)
VALUES
('news-club-1', 'egaming-club', 'E-Gaming Club: Campus Valorant & FC25 Showdown', 'Qualifiers kick off this Friday at the Building 12 Esports Arena with exciting prize pools.', 'Get ready gamers! The UDST E-Gaming Club is hosting our semester tournament with 16 competing collegiate squads. Check the member Discord channels for squad brackets and warm-up schedules.', 'Sept 7, 2026', now() - interval '14 hours'),
('news-club-2', 'astronomy-club', 'Astronomy Club: Desert Night Sky Expedition', 'Telescope viewing night in Zekreet to observe Saturn''s rings and the Perseid meteor trail.', 'Join us this Thursday evening for a guided celestial observation under the dark desert skies of Zekreet. Bus transportation leaves from UDST Student Center at 5:30 PM sharp. Exclusive sign-up link posted in our member WhatsApp group.', 'Sept 7, 2026', now() - interval '18 hours'),
('news-club-3', 'art-club', 'Art Club: Annual Campus Murals Project Underway', 'Call for student painters, sketch artists, and digital creators to design the Student Hub wall.', 'Calling all creative minds! We are curating modern student artwork celebrating Qatari youth culture and technological innovation. Canvas and materials are provided by the club. Join us at Fine Arts Studio 104.', 'Sept 6, 2026', now() - interval '24 hours'),
('news-club-4', 'entrepreneur-club', 'Entrepreneur Club: QSTP Innovation Incubator Workshop', 'Pitch your tech startup concept directly to venture mentors from Qatar Science & Technology Park.', 'Learn how to formulate investor decks, validate market problems, and apply for non-dilutive seed funding. Open to all students with engineering, health tech, or business ideas.', 'Sept 4, 2026', now() - interval '72 hours')
ON CONFLICT (id) DO NOTHING;
