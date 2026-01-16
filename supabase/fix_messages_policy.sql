-- FIX MESSAGE POLICIES (Run this!)

-- 1. Drop existing policies to handle conflicts
drop policy if exists "Authenticated users can insert messages" on public.messages;
drop policy if exists "Anyone can insert anonymous messages" on public.messages;
drop policy if exists "Everyone can read messages" on public.messages;

-- 2. Allow SELECT (Reading) for everyone (or you can restrict to authenticated)
create policy "Everyone can read messages"
  on public.messages for select
  using ( true );

-- 3. Allow INSERT (Sending) for Authenticated Users
create policy "Authenticated users can insert messages"
  on public.messages for insert
  with check ( auth.role() = 'authenticated' );

-- 4. (Optional) Allow Anonymous Insert if you ever turn it back on
-- create policy "Anonymous insert" on public.messages for insert with check ( is_anonymous = true );
