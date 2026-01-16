-- FIX RECURSIVE RLS POLICIES

-- 1. Create a Helper Function (Security Definer) to check membership
-- This bypasses RLS on the table itself to avoid infinite loops.
create or replace function public.is_channel_member(c_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    return exists (
        select 1 
        from public.channel_members 
        where channel_id = c_id 
        and user_id = auth.uid()
    );
end;
$$;

-- 2. Update Channels Policy
drop policy if exists "View channels" on public.channels;
create policy "View channels"
    on public.channels for select
    using (
        type = 'global' 
        OR 
        public.is_channel_member(id)
    );

-- 3. Update Channel Members Policy
drop policy if exists "View channel members" on public.channel_members;
create policy "View channel members"
    on public.channel_members for select
    using (
        -- User can see themselves
        user_id = auth.uid()
        OR
        -- User can see members of channels they are in
        public.is_channel_member(channel_id)
    );

-- 4. Update Messages Policy (Just in case)
drop policy if exists "Public messages are viewable by everyone" on public.messages; -- Old global one
drop policy if exists "View messages" on public.messages;

create policy "View messages"
    on public.messages for select
    using (
        -- Global chat is public-ish
        (select type from public.channels where id = messages.channel_id) = 'global'
        OR
        -- Or member of the group
        public.is_channel_member(channel_id)
    );
