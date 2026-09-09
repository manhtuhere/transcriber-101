-- Two things the Supabase linter flags, neither of which changes who can see what.
--
-- 1. auth.uid() inside a policy is re-evaluated for every row scanned. Wrapping
--    it as (select auth.uid()) makes Postgres hoist it into an InitPlan and
--    evaluate it once per statement instead. On a book with hundreds of
--    chapters that is hundreds of GUC reads saved per query.
--
-- 2. chapters.owner_id and bookmarks.owner_id are foreign keys with no covering
--    index. Every RLS check filters on that column, and deleting a user has to
--    scan the table without one. books.owner_id is already covered by
--    books_owner_created_idx, and chapters.book_id by the unique (book_id, idx).
--
-- ALTER POLICY rather than drop-and-recreate: dropping first would leave a
-- window with no policy on the table, and the parent EXISTS checks below are
-- the fix migration 0005 had to make. They are reproduced here verbatim apart
-- from the subselect — do not simplify them away. Without the EXISTS clause,
-- owner_id defaulting to auth.uid() lets anyone attach a row to someone else's
-- book: invisible to that book's owner, but still there and still synthesized.

alter policy books_owner_all on public.books
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter policy chapters_owner_all on public.chapters
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.books b
      where b.id = chapters.book_id
        and b.owner_id = (select auth.uid())
    )
  );

alter policy bookmarks_owner_all on public.bookmarks
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.books b
      where b.id = bookmarks.book_id
        and b.owner_id = (select auth.uid())
    )
  );

create index if not exists chapters_owner_idx on public.chapters (owner_id);
create index if not exists bookmarks_owner_idx on public.bookmarks (owner_id);
