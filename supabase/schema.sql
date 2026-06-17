-- ============================================================
-- PowerPlay Academy — Supabase / Postgres schema
-- Run this in the Supabase SQL editor (or via migrations).
-- Auth is handled by Supabase Auth (auth.users). Profiles extend it.
-- ============================================================

-- ---------- reference data (seeded from curriculum.json) ----------
create table if not exists levels (
  key   text primary key,              -- 'trainee','rookie','rally','wrc','champion'
  name  text not null,
  ord   int  not null,
  duration text,
  signoff_authority text                -- who is allowed to sign this level off
);

create table if not exists modules (
  id    text primary key,              -- '<level>-<code>'  e.g. 'trainee-01'
  level_key text not null references levels(key),
  phase text not null,
  code  text not null,
  title text not null,
  ord   int  not null
);

create table if not exists module_criteria (   -- practical "tick when competent" items
  id serial primary key,
  module_id text not null references modules(id) on delete cascade,
  text text not null
);

create table if not exists test_questions (    -- online test bank (authored per level)
  id serial primary key,
  level_key text not null references levels(key),
  question text not null,
  options jsonb not null,               -- ["a","b","c","d"]
  correct_index int not null,
  is_safety boolean not null default false
);

-- ---------- people ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  venue text,
  role text not null default 'trainee'  -- 'trainee' | 'assessor' | 'manager' | 'admin'
        check (role in ('trainee','assessor','manager','admin')),
  created_at timestamptz not null default now()
);

-- ---------- progress (all dated) ----------
create table if not exists module_progress (   -- learning a module
  id serial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  module_id text not null references modules(id),
  learned_at timestamptz not null default now(),
  unique (profile_id, module_id)
);

create table if not exists practical_signoffs ( -- assessor signs a module's practical
  id serial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  module_id text not null references modules(id),
  outcome text not null check (outcome in ('competent','not_yet')),
  assessor_id uuid references profiles(id),
  assessor_name text not null,
  initials text,
  notes text,
  signed_at timestamptz not null default now(),
  unique (profile_id, module_id)
);

create table if not exists test_attempts (
  id serial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  level_key text not null references levels(key),
  score int not null,
  safety_ok boolean not null,
  passed boolean not null,
  attempted_at timestamptz not null default now()
);

create table if not exists certifications (
  id serial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  level_key text not null references levels(key),
  certified_at timestamptz not null default now(),
  by_name text,
  unique (profile_id, level_key)
);

create table if not exists activity_log (
  id serial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  at timestamptz not null default now(),
  text text not null
);

-- ---------- helper: is the current user staff (can assess)? ----------
create or replace function is_staff() returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('assessor','manager','admin')
  );
$$;

-- ---------- view: per-profile, per-level certification status ----------
create or replace view v_level_status as
select
  pr.id as profile_id,
  l.key as level_key,
  (select count(*) from modules m where m.level_key = l.key) as modules_total,
  (select count(*) from practical_signoffs s
     join modules m on m.id = s.module_id
     where m.level_key = l.key and s.profile_id = pr.id and s.outcome='competent') as modules_signed,
  exists (select 1 from test_attempts t
     where t.profile_id = pr.id and t.level_key = l.key and t.passed) as test_passed,
  exists (select 1 from certifications c
     where c.profile_id = pr.id and c.level_key = l.key) as certified
from profiles pr cross join levels l;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles            enable row level security;
alter table module_progress     enable row level security;
alter table practical_signoffs  enable row level security;
alter table test_attempts       enable row level security;
alter table certifications      enable row level security;
alter table activity_log        enable row level security;
-- reference tables stay readable to all signed-in users:
alter table levels          enable row level security;
alter table modules         enable row level security;
alter table module_criteria enable row level security;
alter table test_questions  enable row level security;

-- reference: read for any authenticated user
create policy ref_read_levels   on levels          for select to authenticated using (true);
create policy ref_read_modules  on modules         for select to authenticated using (true);
create policy ref_read_crit     on module_criteria for select to authenticated using (true);
create policy ref_read_q        on test_questions  for select to authenticated using (true);

-- profiles: everyone signed-in can read the roster (needed for assessors);
-- you may insert/update only your own row (role is set/changed by admins only).
create policy prof_read   on profiles for select to authenticated using (true);
create policy prof_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy prof_update on profiles for update to authenticated using (id = auth.uid());

-- module_progress: a trainee manages their own; staff can read all.
create policy mp_owner on module_progress for all to authenticated
  using (profile_id = auth.uid() or is_staff())
  with check (profile_id = auth.uid());

-- test_attempts: a trainee writes/reads their own; staff can read all.
create policy ta_owner on test_attempts for all to authenticated
  using (profile_id = auth.uid() or is_staff())
  with check (profile_id = auth.uid());

-- practical_signoffs: only staff can create/update; trainee can read their own.
create policy ps_read on practical_signoffs for select to authenticated
  using (profile_id = auth.uid() or is_staff());
create policy ps_write on practical_signoffs for insert to authenticated
  with check (is_staff());
create policy ps_update on practical_signoffs for update to authenticated
  using (is_staff());

-- certifications: staff create; everyone reads their own / staff read all.
create policy cert_read  on certifications for select to authenticated
  using (profile_id = auth.uid() or is_staff());
create policy cert_write on certifications for insert to authenticated
  with check (is_staff());

-- activity_log: owner or staff read; insert for self or by staff.
create policy log_read on activity_log for select to authenticated
  using (profile_id = auth.uid() or is_staff());
create policy log_insert on activity_log for insert to authenticated
  with check (profile_id = auth.uid() or is_staff());
