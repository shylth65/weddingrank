-- WeddingRank reputation system v1
-- Live WeddingRank Supabase DB applied 2026-08-31.

create schema if not exists private;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'WeddingRank 회원',
  avatar_url text,
  bio text,
  points integer not null default 0 check(points >= 0),
  level integer not null default 1 check(level between 1 and 100),
  review_count integer not null default 0 check(review_count >= 0),
  verified_review_count integer not null default 0 check(verified_review_count >= 0),
  helpful_received integer not null default 0 check(helpful_received >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews add column if not exists verification_status text not null default '미인증';
alter table public.reviews add column if not exists helpful_count integer not null default 0;
alter table public.reviews add column if not exists photo_count integer not null default 0;

create table if not exists public.review_helpful (
  review_id uuid not null references public.reviews(review_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(review_id,user_id)
);

create table if not exists public.review_verifications (
  verification_id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(review_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_type text not null check(verification_type in ('견적','계약','실예식')),
  status text not null default '대기' check(status in ('대기','승인','반려')),
  evidence_url text,
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(review_id,verification_type)
);

create table if not exists public.point_events (
  event_id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  points integer not null check(points <> 0),
  reason text not null,
  created_at timestamptz not null default now(),
  unique(user_id,source_type,source_id,reason)
);

create table if not exists public.badges (
  badge_code text primary key,
  name text not null unique,
  description text not null,
  icon text,
  min_points integer not null default 0,
  min_reviews integer not null default 0,
  min_verified_reviews integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null references public.badges(badge_code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key(user_id,badge_code)
);

insert into public.badges(badge_code,name,description,icon,min_points,min_reviews,min_verified_reviews) values
('first_review','첫 리뷰','첫 번째 예식장 리뷰 작성','✍️',0,1,0),
('reviewer_5','리뷰어 5','리뷰 5건 작성','⭐',0,5,0),
('verified_1','인증 리뷰어','인증 리뷰 보유','✅',0,0,1),
('trusted_10','신뢰 리뷰어','인증 리뷰 10건 이상','🏅',0,0,10),
('point_1000','WeddingRank 마스터','누적 1,000포인트','👑',1000,0,0)
on conflict (badge_code) do nothing;

alter table public.profiles enable row level security;
alter table public.review_helpful enable row level security;
alter table public.review_verifications enable row level security;
alter table public.point_events enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create index if not exists reviews_room_id_idx on public.reviews(room_id);
create index if not exists wedding_prices_room_id_idx on public.wedding_prices(room_id);
create index if not exists point_events_user_created_idx on public.point_events(user_id,created_at desc);
