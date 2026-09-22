-- supabase/migrations/016_gig_and_group_photos.sql
-- Run after 015.
--
-- A single cover/banner image for gigs and groups, picked during creation —
-- same reason as event photos (007/015): Storage's per-object RLS needs a
-- real, owned row to check the folder against, so the upload happens right
-- after the row is inserted, not before.
--
-- Neither table lets its owner UPDATE their own row directly (gigs: only
-- admins can edit, on purpose, see 002_gig_moderation.sql; clubs: same,
-- see 009_clubs.sql) — so setting the image column back onto the row after
-- upload goes through a narrow security-definer RPC each, the same shape as
-- set_join_questions(), rather than opening up a general UPDATE policy.

alter table gigs add column if not exists cover_image_url text;
alter table clubs add column if not exists banner_image_url text;
-- clubs uses column-level grants, not a table-level one (see 009/010/015) —
-- same reason as who_can_join's grant in 015.
grant select (banner_image_url) on clubs to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('gig-photos', 'gig-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('club-photos', 'club-photos', true)
on conflict (id) do nothing;

drop policy if exists "Posters manage own gig photos" on storage.objects;
create policy "Posters manage own gig photos" on storage.objects
  for all
  using (
    bucket_id = 'gig-photos'
    and exists (select 1 from gigs g where g.id::text = (storage.foldername(name))[1] and g.posted_by_user_id = auth.uid())
  )
  with check (
    bucket_id = 'gig-photos'
    and exists (select 1 from gigs g where g.id::text = (storage.foldername(name))[1] and g.posted_by_user_id = auth.uid())
  );

drop policy if exists "Owners manage own club banner" on storage.objects;
create policy "Owners manage own club banner" on storage.objects
  for all
  using (
    bucket_id = 'club-photos'
    and exists (select 1 from clubs c where c.id = (storage.foldername(name))[1] and c.owner_user_id = auth.uid())
  )
  with check (
    bucket_id = 'club-photos'
    and exists (select 1 from clubs c where c.id = (storage.foldername(name))[1] and c.owner_user_id = auth.uid())
  );

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
