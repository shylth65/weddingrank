-- Apply after WeddingRank_Free_Board_v1.sql. Member posts are public upon submission.
alter table public.wedding_board_posts alter column status set default 'published';
drop policy if exists "Members submit pending posts" on public.wedding_board_posts;
create policy "Members publish own posts" on public.wedding_board_posts
  for insert to authenticated
  with check (author_id=(select auth.uid()) and kind='member'
    and status='published' and post_date is null and author_name<>'WeddingRank');
drop policy if exists "Board moderators read pending posts" on public.wedding_board_posts;
drop policy if exists "Administrators moderate posts" on public.wedding_board_posts;
revoke update(status) on public.wedding_board_posts from authenticated;
