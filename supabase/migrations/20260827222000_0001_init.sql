create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  author text,
  description text,
  cover_url text,
  status text not null default 'draft'
    check (status in ('draft', 'processing', 'ready', 'failed')),
  source_hash text,
  total_duration_sec numeric,
  created_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  idx int not null,
  title text not null,
  text_content text not null,
  char_count int not null,
  tts_voice text not null default 'aura-2-thalia-en',
  audio_path text,
  duration_sec numeric,
  start_offset_sec numeric,
  bytes bigint,
  status text not null default 'pending'
    check (status in ('pending', 'synthesizing', 'ready', 'failed')),
  error text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (book_id, idx)
);

-- tts_voice is denormalized onto the chunk so the synthesis cache can be looked
-- up by (text_hash, tts_voice) without joining back through chapters.
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  idx int not null,
  text text not null,
  text_hash text not null,
  tts_voice text not null,
  audio_path text,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  unique (chapter_id, idx)
);

create index books_owner_created_idx on public.books (owner_id, created_at desc);
create index chapters_status_idx on public.chapters (status) where status = 'pending';
create index chunks_cache_idx on public.chunks (text_hash, tts_voice);

alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.chunks enable row level security;

create policy books_owner_all on public.books
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy chapters_owner_all on public.chapters
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy chunks_owner_all on public.chunks
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
