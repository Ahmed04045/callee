-- supabase/migrations/013_questions_prefs_reminders.sql
-- Run in the Supabase SQL Editor AFTER 012_tickets_saves_reports_applicants.sql. Safe to re-run.
--
--   1. Custom questions: gigs, events and groups can ask applicants / attendees /
--      joiners a set of questions; answers are stored and shown to the poster
--   2. Application details: cover message + a contact method chosen by the applicant
--   3. Server-side rules: deadlines, own-gig and approved-only checks on applying
--   4. Notifications: translatable (structured `data`), per-user mute preferences,
--      and a daily "happening tomorrow" reminder for people with a ticket

-- =====================================================================
-- 1. Questions + answers (columns)
-- =====================================================================
alter table gigs add column if not exists questions jsonb;
alter table events add column if not exists questions jsonb;
alter table clubs add column if not exists join_questions jsonb;

alter table applications add column if not exists answers jsonb not null default '{}'::jsonb;
alter table applications add column if not exists message text;
alter table applications add column if not exists contact_method text;
alter table applications add column if not exists contact_value text;
alter table event_attendees add column if not exists answers jsonb not null default '{}'::jsonb;
alter table club_join_requests add column if not exists answers jsonb not null default '{}'::jsonb;

alter table applications drop constraint if exists applications_message_len;
alter table applications add constraint applications_message_len check (message is null or char_length(message) <= 1000);
alter table applications drop constraint if exists applications_contact_method_check;
alter table applications add constraint applications_contact_method_check
  check (contact_method is null or contact_method in ('phone', 'whatsapp', 'instagram', 'telegram', 'discord', 'email'));
alter table applications drop constraint if exists applications_contact_value_len;
alter table applications add constraint applications_contact_value_len check (contact_value is null or char_length(contact_value) <= 80);

-- Everyone must be able to read a club's join questions before requesting to join.
grant select (join_questions) on clubs to anon, authenticated;

-- Clean any submitted question list: at most 8, sane types, trimmed, bounded lengths.
-- question shape: { id, label, type: text|long|choice|yesno, required, options? }
create or replace function public.clean_questions(p jsonb) returns jsonb
language plpgsql immutable as $$
declare q jsonb; result jsonb := '[]'::jsonb; n int := 0; t text; opts jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return null; end if;
  for q in select * from jsonb_array_elements(p) loop
    exit when n >= 8;
    continue when jsonb_typeof(q) <> 'object' or coalesce(trim(q->>'label'), '') = '';
    t := coalesce(q->>'type', 'text');
    if t not in ('text', 'long', 'choice', 'yesno') then t := 'text'; end if;
    opts := null;
    if t = 'choice' then
      select jsonb_agg(left(trim(v), 100)) into opts
      from (select v from jsonb_array_elements_text(case when jsonb_typeof(q->'options') = 'array' then q->'options' else '[]'::jsonb end) as v limit 10) s
      where trim(v) <> '';
      continue when opts is null or jsonb_array_length(opts) < 2;
    end if;
    result := result || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', left(coalesce(nullif(q->>'id', ''), 'q' || (n + 1)), 20),
      'label', left(trim(q->>'label'), 200),
      'type', t,
      'required', coalesce(q->>'required', 'false') in ('true', 't'),
      'options', opts
    )));
    n := n + 1;
  end loop;
  return case when jsonb_array_length(result) = 0 then null else result end;
end;
$$;

create or replace function public.trg_clean_gig_questions() returns trigger language plpgsql as $$
begin new.questions := public.clean_questions(new.questions); return new; end; $$;
create or replace function public.trg_clean_club_questions() returns trigger language plpgsql as $$
begin new.join_questions := public.clean_questions(new.join_questions); return new; end; $$;

drop trigger if exists trg_clean_gig_questions on gigs;
create trigger trg_clean_gig_questions before insert or update of questions on gigs for each row execute function public.trg_clean_gig_questions();
drop trigger if exists trg_clean_event_questions on events;
create trigger trg_clean_event_questions before insert or update of questions on events for each row execute function public.trg_clean_gig_questions();
drop trigger if exists trg_clean_club_questions on clubs;
create trigger trg_clean_club_questions before insert or update of join_questions on clubs for each row execute function public.trg_clean_club_questions();

-- Check a set of answers against a question list. Raises on missing required
-- answers, oversized answers, or a choice that isn't one of the options.
create or replace function public.validate_answers(p_questions jsonb, p_answers jsonb) returns void
language plpgsql immutable as $$
declare q jsonb; a text;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then return; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'ANSWERS_INVALID'; end if;
  if pg_column_size(p_answers) > 20000 then raise exception 'ANSWERS_TOO_LARGE'; end if;
  for q in select * from jsonb_array_elements(p_questions) loop
    a := nullif(trim(p_answers ->> (q->>'id')), '');
    if coalesce((q->>'required')::boolean, false) and a is null then raise exception 'ANSWER_REQUIRED'; end if;
    if a is not null then
      if char_length(a) > 1000 then raise exception 'ANSWER_TOO_LONG'; end if;
      if q->>'type' = 'choice' and not ((q->'options') @> to_jsonb(a)) then raise exception 'ANSWER_INVALID'; end if;
      if q->>'type' = 'yesno' and a not in ('yes', 'no') then raise exception 'ANSWER_INVALID'; end if;
    end if;
  end loop;
end;
$$;

-- =====================================================================
-- 2/3. Applying to a gig: enforced on the server (not just the form)
-- =====================================================================
create or replace function public.trg_check_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare g gigs;
begin
  select * into g from gigs where id = new.gig_id;
  if not found or g.status <> 'approved' then raise exception 'GIG_NOT_AVAILABLE'; end if;
  if g.posted_by_user_id = new.user_id then raise exception 'OWN_GIG'; end if;
  if g.deadline is not null and g.deadline < (now() at time zone 'Asia/Qatar')::date then raise exception 'DEADLINE_PASSED'; end if;
  perform public.validate_answers(g.questions, new.answers);
  return new;
end;
$$;
drop trigger if exists trg_check_application on applications;
create trigger trg_check_application before insert on applications for each row execute function public.trg_check_application();

-- RSVP answers (only when the event has questions)
create or replace function public.trg_check_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
declare e events;
begin
  select * into e from events where id = new.event_id;
  if found then perform public.validate_answers(e.questions, new.answers); end if;
  return new;
end;
$$;
drop trigger if exists trg_check_rsvp on event_attendees;
create trigger trg_check_rsvp before insert on event_attendees for each row execute function public.trg_check_rsvp();

-- Group questions: the creator (even while pending), a club moderator or an admin can set them.
create or replace function public.set_join_questions(p_club_id text, p_questions jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_user_id into v_owner from clubs where id = p_club_id;
  if not found then return false; end if;
  if not (public.is_admin() or public.is_club_mod(p_club_id) or v_owner = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  update clubs set join_questions = p_questions where id = p_club_id;
  return true;
end;
$$;
revoke all on function public.set_join_questions(text, jsonb) from public, anon;
grant execute on function public.set_join_questions(text, jsonb) to authenticated;

-- Request to join a club, now with answers. (Replaces the version from 010.)
drop function if exists public.request_join_club(text, text);
create or replace function public.request_join_club(p_club_id text, p_message text default '', p_answers jsonb default '{}'::jsonb) returns text
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

  perform public.validate_answers(v_club.join_questions, coalesce(p_answers, '{}'::jsonb));

  insert into club_join_requests (club_id, user_id, message, status, answers)
  values (p_club_id, v_uid, nullif(left(coalesce(p_message, ''), 300), ''), 'pending', coalesce(p_answers, '{}'::jsonb))
  on conflict (club_id, user_id) do update
    set status = 'pending', message = excluded.message, answers = excluded.answers, created_at = now(), reviewed_by = null, reviewed_at = null;

  insert into club_audit_logs (club_id, club_name, user_id, user_name, user_email, action, details)
  values (v_club.id, v_club.name, v_uid, club_display_name(v_uid), (select email from profiles where user_id = v_uid),
          'JOIN_REQUESTED', 'Requested to join');
  return 'OK';
end;
$$;
revoke all on function public.request_join_club(text, text, jsonb) from public, anon;
grant execute on function public.request_join_club(text, text, jsonb) to authenticated;

-- Posters/hosts can also see who applied: profiles of RSVPs are already readable by
-- organizers (006); applicant profiles by gig posters (012). Nothing more to grant.

-- =====================================================================
-- 4a. Notification preferences
-- =====================================================================
create table if not exists notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  muted_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table notification_prefs enable row level security;
drop policy if exists "Read own prefs" on notification_prefs;
create policy "Read own prefs" on notification_prefs for select to authenticated using (user_id = auth.uid());
drop policy if exists "Insert own prefs" on notification_prefs;
create policy "Insert own prefs" on notification_prefs for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Update own prefs" on notification_prefs;
create policy "Update own prefs" on notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on notification_prefs from anon;

-- =====================================================================
-- 4b. Translatable notifications: `data` holds the values (names, titles) and the
-- app builds the sentence in the reader's language. title/body stay as an English fallback.
-- =====================================================================
alter table notifications add column if not exists data jsonb;

drop function if exists public.push_notification(uuid, text, text, text, text);
create or replace function public.push_notification(p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null, p_data jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  -- honour the person's muted types
  if exists (select 1 from notification_prefs where user_id = p_user and p_type = any (muted_types)) then return; end if;
  insert into notifications (user_id, type, title, body, link, data) values (p_user, p_type, p_title, p_body, p_link, p_data);
end;
$$;
revoke all on function public.push_notification(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

-- Re-create every notification trigger function so it fills `data` and uses push_notification.
create or replace function public.trg_notify_join_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_club text; r record;
begin
  select name into v_club from clubs where id = new.club_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    for r in select user_id from club_moderators where club_id = new.club_id loop
      perform push_notification(r.user_id, 'join_request', 'New join request',
        club_display_name(new.user_id) || ' wants to join ' || coalesce(v_club, 'your club'), '/clubs/moderator',
        jsonb_build_object('person', club_display_name(new.user_id), 'club', v_club));
    end loop;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('approved', 'declined') then
    perform push_notification(new.user_id,
      case when new.status = 'approved' then 'join_approved' else 'join_declined' end,
      case when new.status = 'approved' then 'You''re in!' else 'Join request declined' end,
      coalesce(v_club, ''), '/clubs/' || new.club_id, jsonb_build_object('club', v_club));
  end if;
  return null;
end;
$$;

create or replace function public.trg_notify_group_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') and new.owner_user_id is not null then
    perform push_notification(new.owner_user_id,
      case when new.status = 'approved' then 'group_approved' else 'group_rejected' end,
      case when new.status = 'approved' then 'Your group is live' else 'Your group wasn''t approved' end,
      new.name, case when new.status = 'approved' then '/clubs/' || new.id else '/my-submissions' end,
      jsonb_build_object('club', new.name));
  end if;
  return null;
end;
$$;

create or replace function public.trg_notify_submission_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_kind text := case when tg_table_name = 'events' then 'event' else 'gig' end; v_title text;
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') and new.posted_by_user_id is not null then
    v_title := coalesce(to_jsonb(new)->>'title', to_jsonb(new)->>'role');
    perform push_notification(new.posted_by_user_id, 'submission_' || new.status,
      case when new.status = 'approved' then 'Your ' || v_kind || ' was approved' else 'Your ' || v_kind || ' wasn''t approved' end,
      v_title, case when new.status = 'approved' then '/' || v_kind || 's/' || new.id::text else '/my-submissions' end,
      jsonb_build_object('kind', v_kind, 'title', v_title));
  end if;
  return null;
end;
$$;

create or replace function public.trg_notify_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  select posted_by_user_id, title into v_owner, v_title from events where id = new.event_id;
  if v_owner is not null and v_owner <> new.user_id then
    perform push_notification(v_owner, 'rsvp', 'New RSVP', club_display_name(new.user_id) || ' is going to ' || v_title,
      '/events/' || new.event_id::text || '/manage', jsonb_build_object('person', club_display_name(new.user_id), 'title', v_title));
  end if;
  return null;
end;
$$;

create or replace function public.trg_notify_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_role text;
begin
  select posted_by_user_id, role into v_owner, v_role from gigs where id = new.gig_id;
  if v_owner is not null and v_owner <> new.user_id then
    perform push_notification(v_owner, 'application', 'New application', club_display_name(new.user_id) || ' applied to ' || v_role,
      '/gigs/' || new.gig_id::text || '/applicants', jsonb_build_object('person', club_display_name(new.user_id), 'title', v_role));
  end if;
  return null;
end;
$$;

create or replace function public.trg_notify_moderator() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_club text;
begin
  select name into v_club from clubs where id = new.club_id;
  perform push_notification(new.user_id, 'mod_assigned', 'You''re now a moderator', coalesce(v_club, ''), '/clubs/moderator', jsonb_build_object('club', v_club));
  return null;
end;
$$;

create or replace function public.trg_notify_removed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.action = 'REMOVED_BY_MOD' and new.user_id is not null then
    perform push_notification(new.user_id, 'removed', 'Removed from a club', new.club_name, '/clubs', jsonb_build_object('club', new.club_name));
  end if;
  return null;
end;
$$;

create or replace function public.trg_notify_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if old.status is distinct from new.status then
    select role into v_role from gigs where id = new.gig_id;
    perform push_notification(new.user_id, 'application_update', 'Application update',
      coalesce(v_role, 'A gig') || ': ' || new.status, '/gigs/' || new.gig_id::text,
      jsonb_build_object('title', v_role, 'status', new.status));
  end if;
  return null;
end;
$$;

create or replace function public.trg_notify_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select user_id from app_admins loop
    perform push_notification(r.user_id, 'report', 'New report', new.reason || ' on a ' || new.kind, '/admin/reports',
      jsonb_build_object('reason', new.reason, 'kind', new.kind));
  end loop;
  return null;
end;
$$;

-- =====================================================================
-- 4c. Event reminders: the day before, everyone with a ticket gets one notification.
-- Scheduled daily at 18:00 Qatar time (15:00 UTC) if the pg_cron extension is available.
-- If the schedule step below prints a notice, enable "pg_cron" under
-- Database > Extensions and run this whole file again (or call the function by hand).
-- =====================================================================
create table if not exists event_reminders_sent (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (event_id, user_id)
);
alter table event_reminders_sent enable row level security;  -- internal table: no client policies
revoke all on event_reminders_sent from anon, authenticated;

create or replace function public.send_event_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; d date := (now() at time zone 'Asia/Qatar')::date + 1;
begin
  for r in
    select a.user_id, e.id as event_id, e.title
    from event_attendees a join events e on e.id = a.event_id
    where e.status = 'approved' and e.event_date = d
      and not exists (select 1 from event_reminders_sent s where s.event_id = e.id and s.user_id = a.user_id)
  loop
    insert into event_reminders_sent (event_id, user_id) values (r.event_id, r.user_id) on conflict do nothing;
    perform push_notification(r.user_id, 'reminder', 'Happening tomorrow', r.title, '/tickets', jsonb_build_object('title', r.title));
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.send_event_reminders() from public, anon, authenticated;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron is not available yet: enable it under Database > Extensions, then re-run this file.';
  end;
  begin
    perform cron.schedule('circosodal-event-reminders', '0 15 * * *', 'select public.send_event_reminders()');
  exception when others then
    raise notice 'Could not schedule event reminders automatically (%). You can run: select public.send_event_reminders();', sqlerrm;
  end;
end $$;
