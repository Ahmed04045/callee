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
-- gemeni: -- 1. Drop the failing constraint first so we have full control over the table
--ALTER TABLE profiles 
--DROP CONSTRAINT IF EXISTS profiles_account_type_check;

-- 2. Force ALL rows that are not 'personal' to literally become lower-case 'business'
--UPDATE profiles 
--SET account_type = 'business'
--WHERE account_type IS NULL 
--   OR LOWER(TRIM(account_type)) NOT IN ('personal', 'business');

-- 3. Standardize any existing 'personal' / 'business' strings just in case (strips spaces/caps)
--UPDATE profiles 
--SET account_type = LOWER(TRIM(account_type))
--WHERE account_type IS NOT NULL;

-- 4. Now re-add the constraint
--ALTER TABLE profiles 
--ADD CONSTRAINT profiles_account_type_check
--  CHECK (account_type IS NULL OR account_type IN ('personal', 'business'));