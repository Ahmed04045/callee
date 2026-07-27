-- supabase/migrations/005_account_types_personal_business_only.sql
--
-- ONLY run this if you already ran the ORIGINAL version of
-- 004_account_types_and_posting.sql (the one with 'personal', 'brand',
-- 'startup', 'other'). If you're running 004 for the first time, it's
-- already been corrected to just 'personal'/'business' — skip this file
-- entirely, it has nothing to do.
--
-- Narrows the account_type constraint to personal/business, and maps any
-- existing 'brand'/'startup'/'other' rows to 'business' first so they
-- don't get rejected by the new constraint.

update profiles set account_type = 'business'
where account_type in ('brand', 'startup', 'other');

alter table profiles drop constraint if exists profiles_account_type_check;
alter table profiles add constraint profiles_account_type_check
  check (account_type is null or account_type in ('personal', 'business'));