insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

-- Object paths are audio/<bookId>/..., so the first path segment identifies the
-- owning book. The worker uses the secret key and bypasses these entirely.
create policy audio_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );

create policy audio_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );

create policy audio_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );

create policy audio_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] in (
      select id::text from public.books where owner_id = auth.uid()
    )
  );
