-- supabase/migrations/005_account_types_personal_business_only.sql
--
-- Run after 004 on both fresh and existing installations. The checked-in
-- 004 still introduces 'personal', 'brand', 'startup' and 'other'.
--
-- Narrows the account_type constraint to personal/business, and maps any
-- existing 'brand'/'startup'/'other' rows to 'business' first so they
-- don't get rejected by the new constraint.

begin;

-- Remove the OLD constraint before converting rows: it rejects 'business'.
alter table profiles drop constraint if exists profiles_account_type_check;

update profiles set account_type = 'business'
where account_type in ('brand', 'startup', 'other');

alter table profiles add constraint profiles_account_type_check
  check (account_type is null or account_type in ('personal', 'business'));

commit;
