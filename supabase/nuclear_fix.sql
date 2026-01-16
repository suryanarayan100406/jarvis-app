-- NUCLEAR FIX (Use this if nothing else works)

-- 1. Fix Missing Data (Backfill old messages to 'global')
update public.messages 
set channel_id = 'global' 
where channel_id is null;

-- 2. RESET RLS completely for messages
alter table public.messages disable row level security;
drop policy if exists "Authenticated users can insert messages" on public.messages;
drop policy if exists "Anyone can insert anonymous messages" on public.messages;
drop policy if exists "Everyone can read messages" on public.messages;
drop policy if exists "Users can insert their own messages" on public.messages;
drop policy if exists "Authenticated insert" on public.messages;
drop policy if exists "Public read" on public.messages;

-- 3. Re-enable RLS
alter table public.messages enable row level security;

-- 4. Create one single "ALLOW EVERYTHING" policy for messages
-- This allows anyone (even anon, if you enabled it) to Read/Write
-- We rely on the App logic to handle 'channel_id' and 'user_id'
create policy "Allow All Access"
  on public.messages
  for all
  using ( true )
  with check ( true );

-- 5. Confirm Friend Requests RLS is also open enough
drop policy if exists "Users can view their own requests" on public.friend_requests;
drop policy if exists "Users can send requests" on public.friend_requests;
drop policy if exists "Recipients can update status" on public.friend_requests;

create policy "Allow All Friend Requests"
  on public.friend_requests
  for all
  using ( true )
  with check ( true );
