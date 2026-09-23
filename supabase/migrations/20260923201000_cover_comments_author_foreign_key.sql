create index if not exists comments_author_id_idx
   on public.comments (author_id)
   where author_id is not null;
