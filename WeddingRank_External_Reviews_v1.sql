-- WeddingRank external public-review pipeline v1
-- Member-written reviews stay in public.reviews and are never merged into these tables.
create table if not exists public.wedding_review_sources (
  source_id uuid primary key default gen_random_uuid(),
  hall_id uuid not null references public.wedding_halls(hall_id) on delete cascade,
  source_url text not null,
  source_name text not null,
  source_domain text not null,
  source_type text not null default 'public_review' check (source_type in ('public_review','official_info','news','other')),
  published_date date,
  analyzed_at timestamptz not null default now(),
  quality_score smallint not null default 0 check (quality_score between 0 and 100),
  summary text check (summary is null or char_length(summary) <= 600),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hall_id, source_url)
);

create table if not exists public.wedding_review_analysis (
  analysis_id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references public.wedding_review_sources(source_id) on delete cascade,
  hall_id uuid not null references public.wedding_halls(hall_id) on delete cascade,
  food_score numeric(3,2) check (food_score between 1 and 5),
  access_score numeric(3,2) check (access_score between 1 and 5),
  parking_score numeric(3,2) check (parking_score between 1 and 5),
  facility_score numeric(3,2) check (facility_score between 1 and 5),
  bride_waiting_score numeric(3,2) check (bride_waiting_score between 1 and 5),
  banquet_score numeric(3,2) check (banquet_score between 1 and 5),
  service_score numeric(3,2) check (service_score between 1 and 5),
  value_score numeric(3,2) check (value_score between 1 and 5),
  sentiment text check (sentiment in ('positive','mixed','negative','neutral')),
  evidence_strength smallint not null default 0 check (evidence_strength between 0 and 100),
  analyzed_at timestamptz not null default now()
);

create table if not exists public.external_wedding_ratings (
  hall_id uuid primary key references public.wedding_halls(hall_id) on delete cascade,
  source_count integer not null default 0 check (source_count >= 0),
  food_score numeric(3,2) check (food_score between 1 and 5),
  access_score numeric(3,2) check (access_score between 1 and 5),
  parking_score numeric(3,2) check (parking_score between 1 and 5),
  facility_score numeric(3,2) check (facility_score between 1 and 5),
  bride_waiting_score numeric(3,2) check (bride_waiting_score between 1 and 5),
  banquet_score numeric(3,2) check (banquet_score between 1 and 5),
  service_score numeric(3,2) check (service_score between 1 and 5),
  value_score numeric(3,2) check (value_score between 1 and 5),
  overall_score numeric(3,2) check (overall_score between 1 and 5),
  summary text check (summary is null or char_length(summary) <= 800),
  methodology_version text not null default 'external_v1',
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.wedding_review_sources enable row level security;
alter table public.wedding_review_analysis enable row level security;
alter table public.external_wedding_ratings enable row level security;

create index if not exists wedding_review_sources_hall_idx on public.wedding_review_sources(hall_id);
create index if not exists wedding_review_sources_public_idx on public.wedding_review_sources(hall_id, is_published, quality_score desc);
create index if not exists wedding_review_analysis_hall_idx on public.wedding_review_analysis(hall_id);

drop policy if exists "public read approved external review sources" on public.wedding_review_sources;
create policy "public read approved external review sources" on public.wedding_review_sources
for select to anon, authenticated using (is_published = true);
drop policy if exists "public read external wedding ratings" on public.external_wedding_ratings;
create policy "public read external wedding ratings" on public.external_wedding_ratings
for select to anon, authenticated using (is_public = true and source_count >= 3);
drop policy if exists "no public access to external review analysis" on public.wedding_review_analysis;
create policy "no public access to external review analysis" on public.wedding_review_analysis
for all to anon, authenticated using (false) with check (false);

grant select on public.wedding_review_sources to anon, authenticated;
grant select on public.external_wedding_ratings to anon, authenticated;
revoke all on public.wedding_review_analysis from anon, authenticated;
