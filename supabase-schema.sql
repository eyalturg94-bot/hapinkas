-- Run this in Supabase SQL editor

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  measurement_type text not null,
  sets_count integer not null default 3,
  labels text[] not null default '{}',
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  user_id text not null,
  session_date date not null,
  sets_data integer[] not null default '{}',
  extra_value numeric,
  notes text,
  next_sets_data integer[] not null default '{}',
  next_extra_value numeric,
  next_notes text,
  created_at timestamptz not null default now(),
  unique(exercise_id, session_date)
);

-- Allow public access (no auth)
alter table exercises enable row level security;
alter table workout_sessions enable row level security;

create policy "allow all exercises" on exercises for all using (true) with check (true);
create policy "allow all sessions" on workout_sessions for all using (true) with check (true);
