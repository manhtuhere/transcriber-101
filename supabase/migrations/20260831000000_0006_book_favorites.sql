-- Favourites as a nullable timestamp rather than a boolean: null means "not a
-- favourite", and a value records when it was marked, so the shelf can be
-- ordered by it later without a second column or a migration.
alter table public.books add column favorited_at timestamptz;

-- Partial index: only favourites are ever filtered on, and they are the small
-- minority of rows.
create index books_favorites_idx
  on public.books (owner_id, favorited_at desc)
  where favorited_at is not null;

-- No new policy needed. books_owner_all already covers update for the owner,
-- and favorited_at is just another column on a row they already own.
