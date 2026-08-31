-- The original policies only checked the row's own owner_id. Because owner_id
-- defaults to auth.uid(), any authenticated user could insert a chapter
-- pointing at someone else's book_id: the row passed the check as their own,
-- stayed invisible to the book's owner, and would still be claimed by the
-- worker, which runs with the secret key and bypasses RLS.
--
-- The fix validates the parent. The nested EXISTS is itself subject to the
-- parent table's RLS, so it sees the book only when the caller owns it.

drop policy if exists chapters_owner_all on public.chapters;
create policy chapters_owner_all on public.chapters
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.books b
      where b.id = chapters.book_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists chunks_owner_all on public.chunks;
create policy chunks_owner_all on public.chunks
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.chapters c
      where c.id = chunks.chapter_id and c.owner_id = auth.uid()
    )
  );
