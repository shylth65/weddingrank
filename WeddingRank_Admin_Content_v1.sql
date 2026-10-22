-- Reuse the existing administrator allowlist. No membership grants are changed.
begin;
revoke truncate on public.wedding_board_posts from anon, authenticated;
grant update (review_text), delete on public.reviews to authenticated;
grant update (title, body), delete on public.wedding_board_posts to authenticated;
create policy "Admins read reviews for moderation" on public.reviews
  for select to authenticated using ((select private.is_weddingrank_admin()));
create policy "Admins edit review text" on public.reviews
  for update to authenticated using ((select private.is_weddingrank_admin()))
  with check ((select private.is_weddingrank_admin()));
create policy "Admins delete reviews" on public.reviews
  for delete to authenticated using ((select private.is_weddingrank_admin()));
create policy "Admins read board for moderation" on public.wedding_board_posts
  for select to authenticated using ((select private.is_weddingrank_admin()));
create policy "Admins edit board text" on public.wedding_board_posts
  for update to authenticated using ((select private.is_weddingrank_admin()))
  with check ((select private.is_weddingrank_admin()));
create policy "Admins delete board posts" on public.wedding_board_posts
  for delete to authenticated using ((select private.is_weddingrank_admin()));
-- Keep the member's displayed review count consistent after moderation.
create function private.after_moderated_review_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_weddingrank_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if exists (select 1 from auth.users where id = old.user_id) then
    perform private.rebuild_reputation(old.user_id);
  end if;
  return old;
end;
$$;
revoke all on function private.after_moderated_review_delete() from public, anon, authenticated;
create trigger review_moderation_refresh_counts after delete on public.reviews
for each row execute function private.after_moderated_review_delete();
commit;
