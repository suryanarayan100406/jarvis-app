-- FIX RLS & SCHEMA TYPES

-- 0. CRITICAL FIX: Ensure messages.channel_id is TEXT
-- We need this to support 'global' and 'dm_...' IDs alongside UUIDs.
do $$ 
begin
    -- Drop the foreign key if it exists (it restricts us to only UUIDs in channels table)
    if exists (select 1 from information_schema.table_constraints where constraint_name = 'messages_channel_id_fkey') then
        alter table public.messages drop constraint messages_channel_id_fkey;
    end if;
end $$;

-- Force column to text (safe to run even if already text)
alter table public.messages alter column channel_id type text;


-- 1. Safe Membership Check (Accepts TEXT, handles UUID conversion)
create or replace function public.check_group_member(channel_id_text text)
returns boolean
language plpgsql
security definer
as $$
begin
    -- Check if it looks like a valid UUID (simple regex)
    if channel_id_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return false;
    end if;

    -- Now safe to cast
    return exists (
        select 1 
        from public.channel_members 
        where channel_id = channel_id_text::uuid 
        and user_id = auth.uid()
    );
end;
$$;

-- 2. Update Channels Policy (Channels/Groups List)
drop policy if exists "View channels" on public.channels;
create policy "View channels"
    on public.channels for select
    using (
        type = 'global' 
        OR 
        -- Implicitly: created_by = auth.uid() is usually covered by membership 'owner', but good to have
        created_by = auth.uid()
        OR
        public.check_group_member(id::text)
    );

-- 3. Update Channel Members Policy
-- (This table uses UUIDs, so we cast to text for our helper, or logic is consistent)
drop policy if exists "View channel members" on public.channel_members;
create policy "View channel members"
    on public.channel_members for select
    using (
        user_id = auth.uid()
        OR
        public.check_group_member(channel_id::text)
    );

-- 4. Update Messages Policy
drop policy if exists "View messages" on public.messages;
drop policy if exists "Public messages are viewable by everyone" on public.messages;

create policy "View messages"
    on public.messages for select
    using (
        -- 1. Global Chat
        channel_id = 'global'
        OR
        -- 2. DMs (Check if part of the DM string)
        (channel_id LIKE 'dm_%' AND channel_id LIKE '%' || auth.uid() || '%')
        OR
        -- 3. Group Chat (UUIDs)
        public.check_group_member(channel_id)
    );
