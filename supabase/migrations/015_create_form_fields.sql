-- supabase/migrations/015_create_form_fields.sql
-- Run after 014.
--
-- Three fields the Create forms were missing, each surfaced on its detail
-- page too rather than just captured and hidden:
--   gigs.commitment    — how much time it actually takes (was nowhere before)
--   events.is_free / events.price — whether there's a cost to attend
--   clubs.who_can_join — eligibility, stated up front instead of only
--                        discoverable by sending a join request and asking

alter table gigs add column if not exists commitment text
  check (commitment is null or commitment in ('One-time', 'A few days', 'A few weeks', 'A few months', 'Ongoing'));

alter table events add column if not exists is_free boolean not null default true;
alter table events add column if not exists price text check (price is null or char_length(price) <= 40);

alter table clubs add column if not exists who_can_join text check (who_can_join is null or char_length(who_can_join) <= 140);

-- create_group() (010) gets a 12th parameter. Postgres identifies a function
-- by name + argument TYPES, so CREATE OR REPLACE with an extra parameter
-- does not replace the 11-arg version — it silently adds a second, separate
-- overload and leaves the old one behind (same trap as an app-side RPC call
-- with the wrong argument names, just from a migration instead of a
-- client — see 013_questions_prefs_reminders.sql's push_notification for
-- the same situation, which is why that one drops the old signature first
-- instead of leaving two). Doing the same here.
drop function if exists public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision);
create or replace function public.create_group(
  p_name text, p_description text, p_category text, p_university text,
  p_whatsapp_link text default '', p_discord_link text default '',
  p_meeting_schedule text default null, p_location text default null,
  p_place_id text default null, p_lat double precision default null, p_lng double precision default null,
  p_who_can_join text default null
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
                     meeting_schedule, room_or_location, place_id, lat, lng, status, owner_user_id, who_can_join)
  values (v_id, trim(p_name), 'user', left(trim(p_university), 60), trim(p_university), trim(p_description), trim(p_category),
          v_pairs[v_pick][1], v_pairs[v_pick][2], v_wa, v_dc,
          coalesce(nullif(trim(p_meeting_schedule), ''), 'To be announced'),
          coalesce(nullif(trim(p_location), ''), 'To be announced'),
          p_place_id, p_lat, p_lng, 'pending', v_uid, nullif(trim(p_who_can_join), ''));
  return v_id;
end;
$$;

revoke all on function public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision, text) from public, anon;
grant execute on function public.create_group(text, text, text, text, text, text, text, text, text, double precision, double precision, text) to authenticated;
