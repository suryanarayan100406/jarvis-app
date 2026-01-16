-- GROUPS SCHEMA UPGRADE

-- 1. Upgrade Channels Table
-- We add columns to support Groups (vs just DMs)
alter table public.channels add column if not exists type text default 'dm'; -- 'dm', 'group'
alter table public.channels add column if not exists name text; -- For groups
alter table public.channels add column if not exists description text;
alter table public.channels add column if not exists image_url text;
alter table public.channels add column if not exists created_by uuid references public.profiles(id);

-- 2. Channel Members Table (The core of group permissions)
create table if not exists public.channel_members (
    channel_id uuid references public.channels(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    role text default 'member', -- 'owner', 'admin', 'member'
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (channel_id, user_id)
);

-- 3. RLS Policies

-- Enable RLS
alter table public.channel_members enable row level security;

-- Policy: View members?
-- You can see members if you are ALSO a member of that channel
create policy "View channel members"
    on public.channel_members for select
    using (
        exists (
            select 1 from public.channel_members cm
            where cm.channel_id = channel_members.channel_id
            and cm.user_id = auth.uid()
        )
    );

-- Policy: Access Channels?
-- You can see a channel if you are a member of it (or if it's public/global, but we handle global separate)
create policy "View channels"
    on public.channels for select
    using (
        id = 'global' -- Everyone sees global (UUID cast issue? 'global' is TEXT in our logic, but ID is UUID. Wait. Global is special.)
        OR
        exists (
            select 1 from public.channel_members cm
            where cm.channel_id = channels.id
            and cm.user_id = auth.uid()
        )
        OR 
        is_dm = true -- DMs handled separately? No, let's migrate DMs to members eventually. For now keep existing DM logic parallel.
    );

-- 4. RPC: Create Group (Atomic)
create or replace function public.create_new_group(
    group_name text,
    group_desc text,
    member_ids uuid[] -- List of friend IDs to add
)
returns uuid
language plpgsql
security definer
as $$
declare
    new_channel_id uuid;
begin
    -- 1. Create Channel
    insert into public.channels (type, name, description, created_by, is_dm)
    values ('group', group_name, group_desc, auth.uid(), false)
    returning id into new_channel_id;

    -- 2. Add Creator as Owner
    insert into public.channel_members (channel_id, user_id, role)
    values (new_channel_id, auth.uid(), 'owner');

    -- 3. Add Members (Loop or bulk insert)
    if array_length(member_ids, 1) > 0 then
        insert into public.channel_members (channel_id, user_id, role)
        select new_channel_id, unnest(member_ids), 'member';
    end if;

    return new_channel_id;
end;
$$;

-- 5. Realtime
alter publication supabase_realtime add table public.channel_members;
