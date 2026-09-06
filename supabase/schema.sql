-- Run in Supabase SQL Editor before first production deployment.
create table if not exists countries (
  id text primary key,
  name text not null,
  code text,
  population bigint,
  military_rank integer,
  economy_rank integer,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists regions (
  id text primary key,
  name text not null,
  country_id text,
  owner_country_id text,
  is_core boolean not null default false,
  resistance numeric,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists resistance_snapshots (
  id bigint generated always as identity primary key,
  region_id text not null,
  resistance numeric not null,
  owner_country_id text,
  created_at timestamptz not null default now()
);
create table if not exists intelligence_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  severity text not null default 'info',
  country_id text,
  region_id text,
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create table if not exists watchlists (
  guild_id text not null,
  entity_type text not null,
  entity_id text not null,
  label text,
  primary key (guild_id, entity_type, entity_id)
);
create index if not exists intelligence_events_occurred_at_idx on intelligence_events (occurred_at desc);
create index if not exists regions_country_id_idx on regions (country_id);
create index if not exists regions_owner_country_id_idx on regions (owner_country_id);
