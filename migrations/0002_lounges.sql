create table if not exists lounges (
  id text primary key,
  airport_code text not null,
  lounge_code text,
  name text not null default '',
  country text not null default '',
  airport_name text not null default '',
  terminal text not null default '',
  location text not null default '',
  location_vi text not null default '',
  opening_hours text not null default '',
  opening_hours_vi text not null default '',
  conditions text not null default '',
  conditions_vi text not null default '',
  additional_info text not null default '',
  additional_info_vi text not null default '',
  facilities jsonb not null default '[]'::jsonb,
  facilities_vi jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  source_url text not null default '',
  image_pdf_src text not null default '',
  updated_at timestamptz,
  checked_at timestamptz
);

create index if not exists lounges_airport_idx on lounges (airport_code);
create index if not exists lounges_country_idx on lounges (country);

create table if not exists sync_meta (
  id integer primary key,
  exported_at timestamptz,
  seeded_at timestamptz not null default now(),
  lounge_count integer not null default 0
);
