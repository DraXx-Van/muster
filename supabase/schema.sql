-- Muster schema v2 (multi-event, real accounts). Run once in the Supabase SQL editor
-- (choose "Run without RLS"). It DROPS and recreates every table, so only run it on a dev project.
-- HACKATHON ONLY: RLS is left OFF; access is scoped in the app. Production would add RLS policies.

create extension if not exists "pgcrypto";

drop table if exists complaints cascade;
drop table if exists attendees cascade;
drop table if exists notifications cascade;
drop table if exists announcements cascade;
drop table if exists issues cascade;
drop table if exists tasks cascade;
drop table if exists assignments cascade;
drop table if exists shifts cascade;
drop table if exists zones cascade;
drop table if exists volunteers cascade;
drop table if exists events cascade;
drop table if exists profiles cascade;

-- One row per account (auth.users). account_type decides which app the person lands in.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  account_type text not null check (account_type in ('coordinator','volunteer','attendee')),
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  venue text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  clock_offset_minutes int not null default 0,   -- demo clock: event "now" = real now + offset
  join_code text not null unique,                -- volunteers sign in and enter it; attendees scan a QR that contains it
  template_id text,
  cover_url text,
  created_at timestamptz not null default now()
);

-- The people working an event: volunteers, coordinators, the organizer. user_id is null for roster
-- entries a coordinator added by hand (no login).
create table volunteers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  email text,
  phone text,
  avatar_url text,
  role text not null default 'volunteer' check (role in ('volunteer','coordinator','organizer')),
  skills text[] not null default '{}',
  availability jsonb not null default '[]',      -- [{"start":"ISO","end":"ISO"}]
  preferred_zone_ids uuid[] not null default '{}',
  max_hours numeric not null default 6,
  reliability numeric not null default 1.0 check (reliability >= 0 and reliability <= 1),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  map_x int not null default 0,                  -- SVG floor plan rectangle (800 x 480)
  map_y int not null default 0,
  map_w int not null default 100,
  map_h int not null default 80,
  coordinator_id uuid references volunteers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  zone_id uuid not null references zones(id) on delete cascade,
  role_name text not null,
  required_skills text[] not null default '{}',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  headcount int not null default 1 check (headcount > 0),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  shift_id uuid not null references shifts(id) on delete cascade,
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  status text not null default 'assigned'
    check (status in ('assigned','confirmed','checked_in','completed','no_show','dropped')),
  score numeric,
  reason text,                                   -- human-readable "why this volunteer"
  checked_in_at timestamptz,
  checked_out_at timestamptz,                    -- for dropped / no_show: when the change happened
  created_at timestamptz not null default now(),
  unique (shift_id, volunteer_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  zone_id uuid references zones(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  assignee_id uuid references volunteers(id) on delete set null,
  created_by uuid references volunteers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  zone_id uuid references zones(id) on delete set null,
  category text not null check (category in ('medical','crowd_surge','missing_equipment','security','other')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  description text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  raised_by uuid references volunteers(id) on delete set null,
  assigned_to uuid references volunteers(id) on delete set null,   -- current responsible coordinator
  escalation_level int not null default 0,                         -- 0 zone coord, 1 head coord, 2 organizer
  ack_deadline timestamptz,                                        -- REAL time (not demo clock)
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  audience text not null default 'all' check (audience in ('all','volunteers','attendees','zone','role')),
  zone_id uuid references zones(id) on delete set null,
  role_name text,
  title text not null,
  body text not null,
  urgent boolean not null default false,
  created_by uuid references volunteers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  kind text not null,                            -- announcement | assignment | issue | escalation
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- People attending the event (not working it). They join by scanning a QR and choosing a display name: no account,
-- no email. The secret token lives only on their device; we store its hash.
create table attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,   -- null for QR attendees
  name text not null,
  email text,
  phone text,
  avatar_url text,
  token_hash text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table complaints (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  submitted_by uuid references profiles(id) on delete set null,
  attendee_id uuid references attendees(id) on delete set null,
  submitter_name text not null,
  contact text,
  category text not null check (category in ('medical','safety','facilities','food','crowd','staff','lost_found','other')),
  zone_id uuid references zones(id) on delete set null,
  description text not null,
  status text not null default 'open' check (status in ('open','in_review','resolved')),
  response text,
  issue_id uuid references issues(id) on delete set null,   -- set when a medical/safety complaint also raised an issue
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index on events (owner_id);
create index on volunteers (event_id);
create index on volunteers (user_id);
create index on shifts (event_id, starts_at);
create index on assignments (event_id);
create index on assignments (volunteer_id);
create index on assignments (shift_id);
create index on issues (event_id, status, ack_deadline);
create index on notifications (volunteer_id, created_at desc);
create index on announcements (event_id, created_at desc);
create index on complaints (event_id, status);
create index on attendees (user_id);
create index on complaints (attendee_id);

-- Realtime
alter publication supabase_realtime add table
  assignments, shifts, tasks, issues, announcements, notifications, complaints, volunteers, zones, attendees;
