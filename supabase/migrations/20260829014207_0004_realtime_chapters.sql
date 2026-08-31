-- Realtime is opt-in per table: supabase_realtime has puballtables = false, so
-- without this the progress UI subscribes, reports SUBSCRIBED, and silently
-- never fires.
alter publication supabase_realtime add table public.chapters;

-- Update payloads carry only the primary key by default; the progress UI needs
-- the new status on the row itself.
alter table public.chapters replica identity full;
