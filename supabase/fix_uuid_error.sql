-- FINAL SCHEMA FIX (Run this to fix the UUID error)

-- 1. Remove the foreign key constraint (so we can use text IDs like 'global' or 'dm_...')
alter table public.messages drop constraint if exists messages_channel_id_fkey;

-- 2. Change column type to TEXT (This fixes the "invalid input syntax for type uuid" error)
alter table public.messages alter column channel_id type text;

-- 3. Now we can safely set the default to 'global'
update public.messages 
set channel_id = 'global' 
where channel_id is null;

-- 4. Re-apply the permisive policies just to be sure
alter table public.messages enable row level security;
drop policy if exists "Allow All Access" on public.messages;
create policy "Allow All Access" on public.messages for all using (true) with check (true);
