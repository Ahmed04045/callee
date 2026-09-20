-- supabase/migrations/011_notifications.sql
-- Run in the Supabase SQL Editor AFTER 010_private_clubs_usernames.sql. Safe to re-run.
--
-- In-app notifications (the bell + the Activity page):
--   * notifications table — each user can read / mark-read / delete only their own
--   * nothing is inserted by the browser: database triggers create notifications
--     when something relevant happens (join requests, approvals, RSVPs,
--     applications, moderator changes, removals)
--   * Realtime is enabled so the bell updates live

-- ---------------------------------------------------------------------
-- Table + RLS
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,                       -- in-app path to open, e.g. /clubs/art-club
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "Read own notifications" on notifications;
create policy "Read own notifications" on notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "Mark own notifications read" on notifications;
create policy "Mark own notifications read" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Delete own notifications" on notifications;
create policy "Delete own notifications" on notifications for delete to authenticated using (user_id = auth.uid());

-- Clients can read, delete their own, and change ONLY read_at.
revoke all on notifications from anon;
revoke insert, update, delete on notifications from authenticated;
grant select, delete on notifications to authenticated;
grant update (read_at) on notifications to authenticated;

create or replace function public.mark_all_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- Internal helper used by the triggers below (never callable from the browser).
create or replace function public.push_notification(p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into notifications (user_id, type, title, body, link) values (p_user, p_type, p_title, p_body, p_link);
end;
$$;
revoke all on function public.push_notification(uuid, text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

-- Club join requests: tell the moderators about a new request, tell the requester the outcome.
create or replace function public.trg_notify_join_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_club text;
begin
  select name into v_club from clubs where id = new.club_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    insert into notifications (user_id, type, title, body, link)
    select m.user_id, 'join_request', 'New join request',
           club_display_name(new.user_id) || ' wants to join ' || coalesce(v_club, 'your club'), '/clubs/moderator'
    from club_moderators m where m.club_id = new.club_id;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('approved', 'declined') then
    perform push_notification(
      new.user_id,
      case when new.status = 'approved' then 'join_approved' else 'join_declined' end,
      case when new.status = 'approved' then 'You''re in!' else 'Join request declined' end,
      coalesce(v_club, ''),
      '/clubs/' || new.club_id
    );
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_join_request on club_join_requests;
create trigger trg_notify_join_request after insert or update of status on club_join_requests
  for each row execute function public.trg_notify_join_request();

-- User-made groups: approved / rejected -> tell the owner.
create or replace function public.trg_notify_group_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') and new.owner_user_id is not null then
    perform push_notification(
      new.owner_user_id,
      case when new.status = 'approved' then 'group_approved' else 'group_rejected' end,
      case when new.status = 'approved' then 'Your group is live' else 'Your group wasn''t approved' end,
      new.name,
      case when new.status = 'approved' then '/clubs/' || new.id else '/my-submissions' end
    );
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_group_review on clubs;
create trigger trg_notify_group_review after update of status on clubs
  for each row execute function public.trg_notify_group_review();

-- Gigs and events: approved / rejected -> tell the poster.
create or replace function public.trg_notify_submission_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_kind text := case when tg_table_name = 'events' then 'event' else 'gig' end;
        v_title text;
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') and new.posted_by_user_id is not null then
    -- events have "title", gigs have "role" (to_jsonb avoids referencing a field the row doesn't have)
    v_title := coalesce(to_jsonb(new)->>'title', to_jsonb(new)->>'role');
    perform push_notification(
      new.posted_by_user_id,
      'submission_' || new.status,
      case when new.status = 'approved' then 'Your ' || v_kind || ' was approved' else 'Your ' || v_kind || ' wasn''t approved' end,
      v_title,
      case when new.status = 'approved' then '/' || v_kind || 's/' || new.id::text else '/my-submissions' end
    );
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_event_review on events;
create trigger trg_notify_event_review after update of status on events
  for each row execute function public.trg_notify_submission_review();
drop trigger if exists trg_notify_gig_review on gigs;
create trigger trg_notify_gig_review after update of status on gigs
  for each row execute function public.trg_notify_submission_review();

-- Someone RSVPs to your event.
create or replace function public.trg_notify_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  select posted_by_user_id, title into v_owner, v_title from events where id = new.event_id;
  if v_owner is not null and v_owner <> new.user_id then
    perform push_notification(v_owner, 'rsvp', 'New RSVP', club_display_name(new.user_id) || ' is going to ' || v_title, '/events/' || new.event_id::text);
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_rsvp on event_attendees;
create trigger trg_notify_rsvp after insert on event_attendees
  for each row execute function public.trg_notify_rsvp();

-- Someone applies to your gig.
create or replace function public.trg_notify_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_role text;
begin
  select posted_by_user_id, role into v_owner, v_role from gigs where id = new.gig_id;
  if v_owner is not null and v_owner <> new.user_id then
    perform push_notification(v_owner, 'application', 'New application', club_display_name(new.user_id) || ' applied to ' || v_role, '/gigs/' || new.gig_id::text);
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_application on applications;
create trigger trg_notify_application after insert on applications
  for each row execute function public.trg_notify_application();

-- You were made a moderator.
create or replace function public.trg_notify_moderator() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_club text;
begin
  select name into v_club from clubs where id = new.club_id;
  perform push_notification(new.user_id, 'mod_assigned', 'You''re now a moderator', coalesce(v_club, ''), '/clubs/moderator');
  return null;
end;
$$;
drop trigger if exists trg_notify_moderator on club_moderators;
create trigger trg_notify_moderator after insert on club_moderators
  for each row execute function public.trg_notify_moderator();

-- A moderator removed you from a club (the audit log row is the signal).
create or replace function public.trg_notify_removed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.action = 'REMOVED_BY_MOD' and new.user_id is not null then
    perform push_notification(new.user_id, 'removed', 'Removed from a club', new.club_name, '/clubs');
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_removed on club_audit_logs;
create trigger trg_notify_removed after insert on club_audit_logs
  for each row execute function public.trg_notify_removed();

-- ---------------------------------------------------------------------
-- Realtime: live bell updates (Realtime only delivers rows the user may SELECT).
-- ---------------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
end $$;
