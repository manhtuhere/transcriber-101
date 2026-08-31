-- A saved spot inside a book: "come back to 1:42:30".
--
-- position_sec is a position in the *book*, not in a chapter file, matching
-- the chapter-marker scheme everywhere else — the player resolves it to a
-- chapter with toChapterPosition, so a bookmark survives a chapter being
-- re-synthesized as long as durations do not shift.
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position_sec numeric not null check (position_sec >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index bookmarks_book_idx on public.bookmarks (book_id, position_sec);

alter table public.bookmarks enable row level security;

-- The parent check is not optional. Without it, owner_id defaulting to
-- auth.uid() lets any authenticated user attach a row to someone else's book:
-- invisible to that book's owner, but still theirs to carry. This is the hole
-- migration 0005 closed on chapters and chunks; it is written in from the
-- start here.
create policy bookmarks_owner_all on public.bookmarks
  for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.books b
      where b.id = bookmarks.book_id and b.owner_id = auth.uid()
    )
  );
