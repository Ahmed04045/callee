-- supabase/migrations/021_announcements_bilingual_admin.sql
-- Run after 020.
--
-- Announcements have only ever been added by hand in the Supabase Table
-- Editor (see schema.sql's own comment) — there was no in-app create flow
-- and no insert policy at all. This adds:
--   1. Optional Arabic title/content columns alongside the existing
--      English ones, so a poster can fill in both. AnnouncementsView falls
--      back to the English text when the Arabic fields are empty.
--   2. Insert/update/delete policies restricted to app_admins, matching
--      the new /admin/announcements page.

alter table announcements add column if not exists title_ar text;
alter table announcements add column if not exists content_ar text;

drop policy if exists "Admins insert announcements" on announcements;
create policy "Admins insert announcements" on announcements
  for insert with check (exists (select 1 from app_admins a where a.user_id = auth.uid()));

drop policy if exists "Admins update announcements" on announcements;
create policy "Admins update announcements" on announcements
  for update using (exists (select 1 from app_admins a where a.user_id = auth.uid()));

drop policy if exists "Admins delete announcements" on announcements;
create policy "Admins delete announcements" on announcements
  for delete using (exists (select 1 from app_admins a where a.user_id = auth.uid()));
