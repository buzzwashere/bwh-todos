-- BWH Todos schema. Run this once against your Neon database
-- (Neon Dashboard -> SQL Editor, or `psql "$DATABASE_URL" -f db/schema.sql`).

create table if not exists todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      text        not null,           -- Auth0 subject (sub claim)
  title        text        not null,
  description  text        not null default '',
  priority     text        not null default 'Medium',
  due_date     text        not null default '', -- 'YYYY-MM-DD' or ''
  notes        text        not null default '',
  keywords     text        not null default '',
  frequency    text        not null default 'one-time',
  status       text        not null default 'Not started',
  completed    boolean     not null default false,
  completed_at text        not null default '', -- 'YYYY-MM-DD' or ''
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Every query is scoped by user_id, so index it.
create index if not exists todos_user_id_idx on todos (user_id);

-- Per-user display preferences for the list. One row per user, so the settings
-- follow the account across devices the way the todos themselves do.
create table if not exists user_settings (
  user_id        text        primary key,      -- Auth0 subject (sub claim)
  sort_by        text        not null default 'Priority',
  show_completed boolean     not null default true,
  updated_at     timestamptz not null default now()
);
