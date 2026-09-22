-- supabase/migrations/012_tickets_saves_reports_applicants.sql
-- Run in the Supabase SQL Editor AFTER 011_notifications.sql. Safe to re-run.
--
--   1. QR tickets: every RSVP is a ticket with a unique code; organizers check
--      people in (by scanning the QR or by hand) and see attendance stats
--   2. Saved items (bookmark events, gigs, clubs)
--   3. Reports (flag a listing) + admin notification
--   4. Gig deadlines
--   5. Applicant screen for gig posters (see applicants, change their status)

-- =====================================================================
-- 1. Tickets
-- =====================================================================
alter table event_attendees add column if not exists ticket_code text not null
  default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
create unique index if not exists idx_event_attendees_ticket_code on event_attendees (ticket_code);
alter table event_attendees add column if not exists checked_in_at timestamptz;
alter table event_attendees add column if not exists checked_in_by uuid references auth.users(id) on delete set null;

-- Scan / enter a ticket code. Only the event's organizer (or an admain) may check
-- people in. Returns jsonb: { status: OK | ALREADY | OWN_TICKET | FORBIDDEN | NOT_FOUND, ... }
-- Nothing about the holder is revealed unless the caller is allowed to see it.
create or replace function public.check_in_ticket(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a event_attendees; e events; who text;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'FORBIDDEN'); end if;
  select * into a from event_attendees where ticket_code = upper(trim(p_code));
  if not found then return jsonb_build_object('status', 'NOT_FOUND'); end if;
  select * into e from events where id = a.event_id;

  if not (public.is_admin() or e.posted_by_user_id = auth.uid()) then
    return jsonb_build_object('status', case when a.user_id = auth.uid() then 'OWN_TICKET' else 'FORBIDDEN' end,
                              'event_id', case when a.user_id = auth.uid() then e.id end);
  end if;

  who := club_display_name(a.user_id);
  if a.checked_in_at is not null then
    return jsonb_build_object('status', 'ALREADY', 'name', who, 'event_id', e.id, 'event_title', e.title,
                              'attendee_id', a.id, 'checked_in_at', a.checked_in_at);
  end if;

  update event_attendees set checked_in_at = now(), checked_in_by = auth.uid() where id = a.id;
  return jsonb_build_object('status', 'OK', 'name', who, 'event_id', e.id, 'event_title', e.title,
                            'attendee_id', a.id, 'checked_in_at', now());
end;
$$;

-- Manual check-in / undo from the attendee list.
create or replace function public.set_check_in(p_attendee_id uuid, p_checked boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare a event_attendees; e events;
begin
  select * into a from event_attendees where id = p_attendee_id;
  if not found then return false; end if;
  select * into e from events where id = a.event_id;
  if not (public.is_admin() or e.posted_by_user_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  update event_attendees
    set checked_in_at = case when p_checked then now() else null end,
        checked_in_by = case when p_checked then auth.uid() else null end
    where id = p_attendee_id;
  return true;
end;
$$;

revoke all on function public.check_in_ticket(text), public.set_check_in(uuid, boolean) from public, anon;
grant execute on function public.check_in_ticket(text), public.set_check_in(uuid, boolean) to authenticated;

-- =====================================================================
-- 2. Saved items
-- =====================================================================
create table if not exists saved_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('event', 'gig', 'club')),
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);
alter table saved_items enable row level security;
drop policy if exists "Read own saved items" on saved_items;
create policy "Read own saved items" on saved_items for select to authenticated using (user_id = auth.uid());
drop policy if exists "Save items" on saved_items;
create policy "Save items" on saved_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Unsave items" on saved_items;
create policy "Unsave items" on saved_items for delete to authenticated using (user_id = auth.uid());
revoke all on saved_items from anon;

-- =====================================================================
-- 3. Reports
-- =====================================================================
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('event', 'gig', 'club', 'profile')),
  item_id text not null,
  reason text not null check (reason in ('spam', 'scam', 'inappropriate', 'wrong_info', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  unique (reporter_id, kind, item_id)
);
create index if not exists idx_reports_status on reports (status, created_at desc);
alter table reports enable row level security;

drop policy if exists "Report items" on reports;
create policy "Report items" on reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
drop policy if exists "Read own reports or all as admin" on reports;
create policy "Read own reports or all as admin" on reports for select to authenticated
  using (reporter_id = auth.uid() or is_admin());
drop policy if exists "Admins review reports" on reports;
create policy "Admins review reports" on reports for update to authenticated
  using (is_admin()) with check (is_admin());
revoke all on reports from anon;
revoke update on reports from authenticated;
grant update (status, resolved_by, resolved_at) on reports to authenticated;

-- Tell every admin when a new report comes in (uses push_notification from 011).
create or replace function public.trg_notify_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, title, body, link)
  select a.user_id, 'report', 'New report', new.reason || ' on a ' || new.kind, '/admin/reports' from app_admins a;
  return null;
end;
$$;
drop trigger if exists trg_notify_report on reports;
create trigger trg_notify_report after insert on reports for each row execute function public.trg_notify_report();

-- =====================================================================
-- 4. Gig deadlines
-- =====================================================================
alter table gigs add column if not exists deadline date;

-- =====================================================================
-- 5. Applicants: posters see & manage applications to their own gigs
-- =====================================================================
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.applications'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table applications drop constraint %I', c.conname);
  end loop;
end $$;
alter table applications add constraint applications_status_check
  check (status in ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected'));

drop policy if exists "Gig posters read applications" on applications;
create policy "Gig posters read applications" on applications for select using (
  exists (select 1 from gigs g where g.id = applications.gig_id and g.posted_by_user_id = auth.uid())
);
drop policy if exists "Admins read applications" on applications;
create policy "Admins read applications" on applications for select using (is_admin());
drop policy if exists "Gig posters update application status" on applications;
create policy "Gig posters update application status" on applications for update using (
  exists (select 1 from gigs g where g.id = applications.gig_id and g.posted_by_user_id = auth.uid())
) with check (
  exists (select 1 from gigs g where g.id = applications.gig_id and g.posted_by_user_id = auth.uid())
);
revoke update on applications from anon, authenticated;
grant update (status) on applications to authenticated;

-- Posters may read the profiles of people who applied to their gigs
-- (same caveat as 006: row access includes date_of_birth, so UI code only selects safe columns).
drop policy if exists "Gig posters read applicant profiles" on profiles;
create policy "Gig posters read applicant profiles" on profiles for select using (
  exists (
    select 1 from applications a join gigs g on g.id = a.gig_id
    where a.user_id = profiles.user_id and g.posted_by_user_id = auth.uid()
  )
);

-- Tell the applicant when their status changes.
create or replace function public.trg_notify_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if old.status is distinct from new.status then
    select role into v_role from gigs where id = new.gig_id;
    perform push_notification(
      new.user_id, 'application_update', 'Application update',
      coalesce(v_role, 'A gig') || ': ' ||
        case new.status when 'reviewing' then 'in review' when 'shortlisted' then 'shortlisted' when 'accepted' then 'accepted' when 'rejected' then 'not selected' else new.status end,
      '/gigs/' || new.gig_id::text
    );
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_application_status on applications;
create trigger trg_notify_application_status after update of status on applications
  for each row execute function public.trg_notify_application_status();
