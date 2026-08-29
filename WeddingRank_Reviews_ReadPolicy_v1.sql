-- WeddingRank v3: 리뷰 공개 조회 정책
-- 목적: 현재는 리뷰 "조회"만 공개하고, 작성은 인증 기능을 붙인 뒤 별도 오픈합니다.
-- 기존 reviews 테이블 구조는 유지합니다.

alter table public.reviews enable row level security;

grant select on table public.reviews to anon, authenticated;

drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read"
on public.reviews
for select
to anon, authenticated
using (true);

-- 안전을 위해 익명 작성 권한은 열지 않습니다.
revoke insert, update, delete on table public.reviews from anon;

-- 로그인 리뷰 작성 기능을 붙일 때 사용할 정책(아직 활성화하지 않음):
-- grant insert on table public.reviews to authenticated;
-- create policy "reviews_authenticated_insert"
-- on public.reviews for insert to authenticated
-- with check (auth.uid() = user_id);
