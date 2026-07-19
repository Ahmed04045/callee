-- supabase/schema.sql
-- Run this once in your Supabase project's SQL Editor (or via the CLI:
-- `supabase db push` if you've set up migrations). Safe to re-run — every
-- statement is guarded with IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- events — powers MainFeedView's "Trending Events" and DiscoverView
-- ---------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  organizer text not null,
  organizer_verified boolean not null default false,
  event_date date not null,
  location text not null,
  lat double precision,
  lng double precision,
  spots int not null default 0,
  tag text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- gigs — powers RecruitView and MainFeedView's "Top Recruitment Calls"
-- ---------------------------------------------------------------------
create table if not exists gigs (
  id uuid primary key default uuid_generate_v4(),
  role text not null,
  posted_by text not null,
  verified boolean not null default false,
  compensation text not null,
  tags text[] not null default '{}',
  details text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- announcements — powers AnnouncementsView (split client-side by category)
-- ---------------------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('system_update', 'local_news')),
  author text not null,
  title text not null,
  content text not null,
  published_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- applications — one row per (user, gig) "Apply" click in RecruitView
-- ---------------------------------------------------------------------
create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  gig_id uuid not null references gigs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (gig_id, user_id)
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- Listings (events/gigs/announcements) are public read, no public write —
-- for now, add/edit rows via the Supabase dashboard's Table Editor while
-- you don't yet have an admin UI. Applications are private per-user.
-- ---------------------------------------------------------------------
alter table events enable row level security;
alter table gigs enable row level security;
alter table announcements enable row level security;
alter table applications enable row level security;

drop policy if exists "Public read events" on events;
create policy "Public read events" on events for select using (true);

drop policy if exists "Public read gigs" on gigs;
create policy "Public read gigs" on gigs for select using (true);

drop policy if exists "Public read announcements" on announcements;
create policy "Public read announcements" on announcements for select using (true);

drop policy if exists "Users read own applications" on applications;
create policy "Users read own applications" on applications
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own applications" on applications;
create policy "Users insert own applications" on applications
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- A little seed data so the app isn't blank on first run. Delete or edit
-- freely from the Table Editor.
-- ---------------------------------------------------------------------
insert into events (title, organizer, organizer_verified, event_date, location, lat, lng, spots, tag)
values
  ('Qatar Youth Tech Hackathon', 'Digital Innovators Hub', true, '2026-08-18', 'Doha Tech District', 25.2854, 51.5310, 22, 'Tech'),
  ('Streetwear & Design Pop-Up', 'Raw Collective', false, '2026-08-24', 'The Pearl, Gallery 3', 25.3707, 51.5528, 8, 'Fashion')
on conflict do nothing;

insert into gigs (role, posted_by, verified, compensation, tags, details, featured)
values
  ('Frontend Web Developer (React/Vite)', 'Nexus Startup Labs', true, 'Paid + Equity', array['Tech','Coding'], 'Building a localized delivery prototype. Need a junior dev to bring Figma designs to life using clean Tailwind layouts.', true),
  ('TikTok Content Creator / Editor', 'Volt Energy Drink Partner', false, 'Paid per video package', array['Media','Video'], 'Looking for a creator to manage local content and trend rollouts. Remote submission only.', true),
  ('Graphic Designer for Apparel Line', 'Ghost Thread Co.', false, 'Paid + Profit Share', array['Design','Art'], 'Launching a minimalist local clothing brand. Need vector graphics and typography assets ready for screenprinting.', false)
on conflict do nothing;

insert into announcements (category, author, title, content)
values
  ('system_update', 'Captee Core Team', 'Welcome to the Unified Youth Ecosystem', 'We''ve expanded the platform to cover tech, media, fashion, and business roles, all in one place built for young creators.'),
  ('local_news', 'Local Desk', 'Doha Tech District adds a youth co-working floor', 'A new shared workspace floor opens this month with discounted desks for student and youth-led teams.')
on conflict do nothing;
