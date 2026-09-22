-- supabase/migrations/017_identity_word.sql
-- Run after 016.
--
-- Removes the "Aura" score (014) entirely — the trigger, the function, the
-- column — and replaces it with something less like a leaderboard: answer a
-- few short questions about yourself and Gemini gives you back one word for
-- who you are, plus a short note on why. Shown as a banner on the profile;
-- tapping it reveals the note. The Career Book itself (career_entries) is
-- unchanged — only its on-screen name changed, to "Receipts", which is a UI
-- string, not a schema one.

drop trigger if exists on_career_entry_change on career_entries;
drop function if exists public.sync_career_aura();
alter table profiles drop column if exists aura;

alter table profiles add column if not exists identity_word text check (identity_word is null or char_length(identity_word) <= 40);
alter table profiles add column if not exists identity_word_reason text check (identity_word_reason is null or char_length(identity_word_reason) <= 600);

-- get_public_profile() (010, extended in 014) drops aura and picks up the two new columns.
-- Same reshape issue as 014 and create_group() in 015 — drop the old shape first.
drop function if exists public.get_public_profile(text);
create or replace function public.get_public_profile(p_username text)
returns table (
  username text, display_name text, avatar_url text, bio text, university text, account_type text,
  profile_views int, looking_for text[], identity_word text, identity_word_reason text
)
language sql stable security definer set search_path = public as $$
  select p.username, p.display_name, p.avatar_url, p.bio, p.university, p.account_type,
    p.profile_views, p.looking_for, p.identity_word, p.identity_word_reason
  from profiles p where p.username = lower(p_username) and p.is_public
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
