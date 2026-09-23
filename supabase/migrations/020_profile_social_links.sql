-- supabase/migrations/020_profile_social_links.sql
-- Run after 019.
--
-- Personal socials on a profile: GitHub, LinkedIn, Instagram and a generic
-- "website" link. Plain text columns (validated client-side, like bio/link
-- on career_entries) rather than a jsonb blob, since the set is small and
-- fixed and each one needs its own icon on the profile.

alter table profiles add column if not exists github_url text check (github_url is null or char_length(github_url) <= 300);
alter table profiles add column if not exists linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 300);
alter table profiles add column if not exists instagram_url text check (instagram_url is null or char_length(instagram_url) <= 300);
alter table profiles add column if not exists website_url text check (website_url is null or char_length(website_url) <= 300);

-- get_public_profile() reshapes its return columns again, same 42P13 trap
-- as 014/017 (see 018's comment) — drop first.
drop function if exists public.get_public_profile(text);
create or replace function public.get_public_profile(p_username text)
returns table (
  username text, display_name text, avatar_url text, bio text, university text, account_type text,
  profile_views int, looking_for text[], identity_word text, identity_word_reason text,
  github_url text, linkedin_url text, instagram_url text, website_url text
)
language sql stable security definer set search_path = public as $$
  select p.username, p.display_name, p.avatar_url, p.bio, p.university, p.account_type,
    p.profile_views, p.looking_for, p.identity_word, p.identity_word_reason,
    p.github_url, p.linkedin_url, p.instagram_url, p.website_url
  from profiles p where p.username = lower(p_username) and p.is_public
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
