-- cover_url was created in 0001 and never read or written. What we actually
-- store is a storage path, exactly as chapters.audio_path does, so the column
-- is renamed rather than left to imply a URL it never held.
alter table public.books rename column cover_url to cover_path;

-- A private bucket, like audio: the covers belong to one reader's library.
-- The size and type limits are set on the bucket rather than only in the
-- client, so a request that skips the UI is still refused.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers', 'covers', false, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Object paths are covers/<bookId>/…, so the first path segment names the
-- owning book. The worker never touches this bucket.
create policy covers_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );

create policy covers_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );

create policy covers_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );

create policy covers_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );
