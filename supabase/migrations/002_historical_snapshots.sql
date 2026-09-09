create table if not exists country_snapshots (
  id uuid primary key default gen_random_uuid(),
  country_id text not null
    references countries(id)
    on delete cascade,
  population bigint,
  military_rank integer,
  economy_rank integer,
  captured_at timestamptz not null default now()
);

create index if not exists
  idx_country_snapshots_country_time
on country_snapshots (
  country_id,
  captured_at desc
);

create index if not exists
  idx_battle_snapshots_battle_time
on battle_snapshots (
  battle_id,
  captured_at desc
);

create index if not exists
  idx_market_prices_item_time
on market_prices (
  item_id,
  captured_at desc
);

create index if not exists
  idx_market_prices_name_time
on market_prices (
  item_name,
  captured_at desc
);
