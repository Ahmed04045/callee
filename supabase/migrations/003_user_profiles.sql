-- supabase/migrations/003_user_profiles.sql
-- Run in the Supabase SQL Editor after 002_gig_moderation.sql.
--
-- Adds a `profiles` table for the user-facing "Edit Profile" info (name,
-- optional date of birth, short bio) — separate from `auth.users`, which
-- only holds login credentials. A trigger auto-creates an empty profile
-- row whenever someone signs up, so the app never has to branch on
-- insert-vs-update; it just upserts.
--
-- Public sharing (a profile page other people can view) is intentionally
-- NOT part of this migration — profiles are owner-read/write only for now.
-- When "share profile" gets built, that's a new, deliberately-scoped
-- public SELECT policy — likely excluding date_of_birth from what's
-- public, worth deciding explicitly then rather than defaulting to it now.

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  date_of_birth date check (date_of_birth is null or date_of_birth <= current_date),
  bio text check (bio is null or char_length(bio) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile" on profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own profile" on profiles;
create policy "Users insert own profile" on profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create an empty profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: give any account that already existed before this migration
-- (e.g. your own) an empty profile row too, so Edit Profile has something
-- to upsert against immediately instead of erroring on first load.
insert into profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;