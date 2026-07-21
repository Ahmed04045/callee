-- supabase/migrations/002_gig_moderation.sql
-- Run in the Supabase SQL Editor after schema.sql. Adds:
--   1. app_admins       — allowlist of user ids with admin rights
--   2. is_admin()       — SECURITY DEFINER helper other policies call
--   3. gigs.status      — pending / approved / rejected moderation state
--   4. updated RLS      — public only ever sees approved gigs; only admins
--                         see/change everything else

-- ---------------------------------------------------------------------
-- 1. Admin allowlist
-- ---------------------------------------------------------------------
create table if not exists app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table app_admins enable row level security;

-- Deny all direct client access — this table is only ever read from
-- inside is_admin() below, never queried directly by the app.
drop policy if exists "No client access to app_admins" on app_admins;
create policy "No client access to app_admins" on app_admins
  for all using (false);

-- ---------------------------------------------------------------------
-- 2. is_admin() — SECURITY DEFINER so it can read app_admins even though
--    the calling user's own RLS on that table denies them access. This
--    is the standard Supabase pattern for "is this user special" checks.
--    It only ever reveals whether the CALLING user is an admin — never
--    the full admin list.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Moderation status on gigs
-- ---------------------------------------------------------------------
alter table gigs add column if not exists status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));

-- One-time backfill: everything that exists right now (your seed data)
-- was effectively hand-curated by you already, so mark it approved.
-- Safe to comment this line out if you re-run this file later — running
-- it again will re-approve anything currently pending.
update gigs set status = 'approved' where status = 'pending';

-- ---------------------------------------------------------------------
-- 4. RLS: replace the old "anyone can read every gig" policy
-- ---------------------------------------------------------------------
drop policy if exists "Public read gigs" on gigs;

create policy "Public read approved gigs" on gigs
  for select using (status = 'approved');

create policy "Admins read all gigs" on gigs
  for select using (is_admin());

-- Signed-in users can submit a gig, but it always lands as pending —
-- there's no way for a submitter to insert themselves as pre-approved.
create policy "Authenticated users submit gigs" on gigs
  for insert to authenticated
  with check (status = 'pending');

-- Only admins can approve/reject/edit.
create policy "Admins update gigs" on gigs
  for update using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- 5. Make yourself an admin.
-- Sign up in the app first with the account you want to use, THEN run
-- this line with your real email.
-- ---------------------------------------------------------------------
insert into app_admins (user_id)
select id from auth.users where email = 'm.ahmed04045@gmail.com'
on conflict do nothing;
