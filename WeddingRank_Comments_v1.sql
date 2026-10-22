begin;
create function private.can_read_wedding_comment_target(p_review uuid,p_post bigint)
returns boolean language sql stable security definer set search_path = '' as $$
 select case
 when p_review is not null and p_post is null then exists (
   select 1 from public.reviews r join public.wedding_halls h on h.hall_id=r.hall_id
   where r.review_id=p_review and ((h.is_public and h.operation_status='운영') or private.is_weddingrank_admin()))
 when p_post is not null and p_review is null then exists (
   select 1 from public.wedding_board_posts p where p.id=p_post
   and (p.status='published' or private.is_weddingrank_admin()))
 else false end;
$$;
revoke all on function private.can_read_wedding_comment_target(uuid,bigint) from public;
grant execute on function private.can_read_wedding_comment_target(uuid,bigint) to anon,authenticated;
create table public.wedding_comments (
 comment_id uuid primary key default gen_random_uuid(),
 review_id uuid references public.reviews(review_id) on delete cascade,
 post_id bigint references public.wedding_board_posts(id) on delete cascade,
 parent_id uuid references public.wedding_comments(comment_id) on delete cascade,
 author_id uuid default auth.uid() references auth.users(id) on delete set null,
 author_name text not null default '회원',
 body text not null,
 is_deleted boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (num_nonnulls(review_id,post_id)=1),
 check (parent_id is distinct from comment_id),
 check ((not is_deleted and length(btrim(body)) between 1 and 2000) or (is_deleted and body=''))
);
create index wedding_comments_review_order on public.wedding_comments(review_id,created_at,comment_id) where review_id is not null;
create index wedding_comments_post_order on public.wedding_comments(post_id,created_at,comment_id) where post_id is not null;
create index wedding_comments_parent on public.wedding_comments(parent_id) where parent_id is not null;
create index wedding_comments_author on public.wedding_comments(author_id);
create function private.validate_wedding_comment()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent_row public.wedding_comments;
begin
 if tg_op='INSERT' then
   if auth.uid() is null then raise exception 'login required' using errcode='42501'; end if;
   new.author_id:=auth.uid();new.is_deleted:=false;
   select coalesce(nullif(nullif(btrim(nickname),''),'WeddingRank 회원'),'회원 '||left(auth.uid()::text,6))
   into new.author_name from public.profiles where user_id=auth.uid();
   new.author_name:=coalesce(new.author_name,'회원 '||left(auth.uid()::text,6));
   if new.parent_id is not null then
     select * into parent_row from public.wedding_comments where comment_id=new.parent_id;
     if not found or parent_row.parent_id is not null or parent_row.is_deleted
       or parent_row.review_id is distinct from new.review_id or parent_row.post_id is distinct from new.post_id then
       raise exception 'reply must belong to a live root comment on the same content' using errcode='23514';
     end if;
   end if;
 else
   if old.is_deleted then raise exception 'deleted comment cannot be edited' using errcode='23514'; end if;
 end if;
 if new.is_deleted then new.body:=''; else new.body:=btrim(new.body); end if;
 new.updated_at:=now();return new;
end;
$$;
revoke all on function private.validate_wedding_comment() from public;
create trigger validate_wedding_comment before insert or update on public.wedding_comments
 for each row execute function private.validate_wedding_comment();
alter table public.wedding_comments enable row level security;
revoke all on public.wedding_comments from anon,authenticated;
grant select on public.wedding_comments to anon,authenticated;
grant insert (review_id,post_id,parent_id,body),update (body,is_deleted) on public.wedding_comments to authenticated;
create policy "Read comments on visible content" on public.wedding_comments for select to anon,authenticated
 using ((select private.can_read_wedding_comment_target(review_id,post_id)));
create policy "Members comment on visible content" on public.wedding_comments for insert to authenticated
 with check (author_id=(select auth.uid()) and not is_deleted and private.can_read_wedding_comment_target(review_id,post_id));
create policy "Authors and admins edit comments" on public.wedding_comments for update to authenticated
 using ((author_id=(select auth.uid()) or (select private.is_weddingrank_admin())) and private.can_read_wedding_comment_target(review_id,post_id))
 with check ((author_id=(select auth.uid()) or (select private.is_weddingrank_admin())) and private.can_read_wedding_comment_target(review_id,post_id));
commit;
