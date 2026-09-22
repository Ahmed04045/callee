-- supabase/migrations/019_grant_new_club_columns.sql
-- Run after 018.
--
-- clubs uses column-level grants, not a table-level one (see 009/010's
-- comment: the WhatsApp/Discord link columns are deliberately left
-- ungranted so they're invisible to a direct table read — only
-- get_club_links() can return them). Every migration that adds a new
-- public-facing column to clubs has to grant that specific column too,
-- or PostgREST rejects the WHOLE query with "permission denied for table
-- clubs" the moment a client selects it alongside the already-granted
-- ones — 013 did this correctly for join_questions; 015 (who_can_join)
-- and 016 (banner_image_url) did not. This is that missing grant.

grant select (who_can_join, banner_image_url) on clubs to anon, authenticated;
