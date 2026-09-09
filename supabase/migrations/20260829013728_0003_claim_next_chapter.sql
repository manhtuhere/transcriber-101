-- FOR UPDATE SKIP LOCKED cannot be expressed through PostgREST, so the claim
-- lives here and the worker calls it with rpc('claim_next_chapter').
-- The worker connects with the secret key, so RLS is bypassed and no
-- security definer is needed.
create or replace function public.claim_next_chapter()
returns setof public.chapters
language sql
as $$
  update public.chapters c
  set status = 'synthesizing', claimed_at = now()
  from (
    select id from public.chapters
    where status = 'pending'
    order by book_id, idx
    for update skip locked
    limit 1
  ) picked
  where c.id = picked.id
  returning c.*;
$$;

-- A worker killed mid-chapter leaves a row claimed forever. Releasing stale
-- claims on the next run is what makes the queue self-healing.
create or replace function public.release_stale_claims(max_age interval default '30 minutes')
returns integer
language sql
as $$
  with released as (
    update public.chapters
    set status = 'pending', claimed_at = null
    where status = 'synthesizing'
      and claimed_at < now() - max_age
    returning 1
  )
  select count(*)::int from released;
$$;
