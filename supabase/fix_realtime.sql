-- REALTIME RESET SCRIPT

-- 1. Remove everything from publication to reset
alter publication supabase_realtime drop table public.messages;
alter publication supabase_realtime drop table public.profiles;
alter publication supabase_realtime drop table public.friend_requests;
alter publication supabase_realtime drop table public.channels;
-- (Try drop just in case checks fail, ignore errors if not exists)

-- 2. Ensure REPLICA IDENTITY is set (Needed for some client updates)
alter table public.messages replica identity full;
alter table public.user_last_read replica identity full;

-- 3. Re-Add everything to Realtime publication
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.friend_requests;

-- 4. CRITICAL: Add user_last_read so sidebar knows when to clear badge
alter publication supabase_realtime add table public.user_last_read;

-- 5. Helper: Re-verify generic permissions just in case
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to anon;
