-- CrewPulse schema. Run once in the Supabase SQL editor.
-- HACKATHON ONLY: RLS is left OFF so the anon key can read/write. Production would add RLS + Supabase Auth.

create extension if not exists "pgcrypto";

-- Reset (safe to re-run)
drop table if exists notifications cascade;
drop table if exists announcements cascade;
drop table if exists issues cascade;
drop table if exists tasks cascade;
drop table if exists assignments cascade;
drop table if exists shifts cascade;
drop table if exists zones cascade;
drop table if exists volunteers cascade;
drop table if exists events cascade;

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  clock_offset_minutes int not null default 0,  -- demo clock: event "now" = real now + offset
  created_at timestamptz not null default now()
);

create table volunteers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text not null default 'volunteer' check (role in ('volunteer','coordinator','organizer')),
  skills text[] not null default '{}',
  availability jsonb not null default '[]',      -- [{"start":"ISO","end":"ISO"}]
  preferred_zone_ids uuid[] not null default '{}',
  max_hours numeric not null default 6,
  reliability numeric not null default 1.0 check (reliability >= 0 and reliability <= 1),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  map_x int not null default 0,                  -- SVG floor plan rectangle
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
  shift_id uuid not null references shifts(id) on delete cascade,
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  status text not null default 'assigned'
    check (status in ('assigned','confirmed','checked_in','completed','no_show','dropped')),
  score numeric,
  reason text,                                   -- human-readable "why this volunteer"
  checked_in_at timestamptz,
  checked_out_at timestamptz,
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
  audience text not null default 'all' check (audience in ('all','zone','role')),
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
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  kind text not null,                            -- announcement | assignment | issue | escalation
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index on shifts (event_id, starts_at);
create index on assignments (volunteer_id);
create index on assignments (shift_id);
create index on issues (status, ack_deadline);
create index on notifications (volunteer_id, created_at desc);

-- Realtime
alter publication supabase_realtime add table assignments, shifts, tasks, issues, announcements, notifications;
