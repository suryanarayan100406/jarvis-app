-- FRIEND REQUEST SYSTEM (Run this in Supabase)

-- 1. Create table
create table public.friend_requests (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate requests between same two people
  unique(sender_id, receiver_id)
);

-- 2. Realtime
alter publication supabase_realtime add table public.friend_requests;

-- 3. RLS
alter table public.friend_requests enable row level security;

-- 4. Policies

-- A. View Policies: Users can see requests they sent OR received
create policy "Users can view their own requests"
  on public.friend_requests for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

-- B. Insert Policy: Users can send requests (sender_id must be themselves)
create policy "Users can send requests"
  on public.friend_requests for insert
  with check ( auth.uid() = sender_id );

-- C. Update Policy: Recipient can Accept/Reject (update status)
create policy "Recipients can update status"
  on public.friend_requests for update
  using ( auth.uid() = receiver_id );

-- D. Helper View for "Friends List" (Optional but helpful)
-- Returns pairs of confirmed friends
create or replace view public.friends_view as
select 
  sender_id as user_id, 
  receiver_id as friend_id,
  inserted_at as became_friends_at
from public.friend_requests
where status = 'accepted'
union
select 
  receiver_id as user_id, 
  sender_id as friend_id,
  inserted_at as became_friends_at
from public.friend_requests
where status = 'accepted';
