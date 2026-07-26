-- supabase/migrations/004_account_types_and_posting.sql
-- Run in the Supabase SQL Editor after 003_user_profiles.sql.
--
-- Adds account_type + university to profiles (onboarding), and kind +
-- posted_by_user_id to gigs (so real users can submit gigs/opportunities,
-- always landing as pending, always traceable to who posted them).

-- ---------------------------------------------------------------------
-- profiles: account type + university
-- ---------------------------------------------------------------------
alter table profiles add column if not exists account_type text
  check (account_type is null or account_type in ('personal', 'brand', 'startup', 'other'));
-- NULL account_type is the signal the app uses to force onboarding —
-- don't backfill a default value here, existing accounts should also see
-- the onboarding screen once, same as any new signup.

alter table profiles add column if not exists university text;
-- Free text, not a fixed list, and not enforced to only apply to
-- 'personal' accounts at the DB level — that's a UI convention only.

-- ---------------------------------------------------------------------
-- gigs: who posted it, and what to call it
-- ---------------------------------------------------------------------
alter table gigs add column if not exists posted_by_user_id uuid references auth.users(id);
-- Nullable on purpose — existing seeded/admin-added gigs have no
-- real poster and that's fine; only user-submitted gigs need this set.

alter table gigs add column if not exists kind text not null default 'gig'
  check (kind in ('gig', 'opportunity'));
-- Label only — 'gig' (Brand/Startup/Other) vs 'opportunity' (Personal).
-- Same table, same status/approval flow either way.

-- ---------------------------------------------------------------------
-- RLS: authenticated users can submit a gig, but only as themselves,
-- and it always lands pending (this replaces the broader insert policy
-- from 002_gig_moderation.sql with a tighter one).
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users submit gigs" on gigs;
create policy "Authenticated users submit gigs" on gigs
  for insert to authenticated
  with check (status = 'pending' and posted_by_user_id = auth.uid());

-- Posters can see their own gigs regardless of status (so they can check
-- on something they submitted before it's approved) — on top of the
-- existing "public reads approved" and "admins read all" policies from
-- 002_gig_moderation.sql, which are unchanged.
drop policy if exists "Posters read own gigs" on gigs;
create policy "Posters read own gigs" on gigs
  for select using (posted_by_user_id = auth.uid());