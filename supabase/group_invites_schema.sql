-- GROUP INVITES SYSTEM

-- 1. Add Status to Members
-- 'active': Joined and can chat.
-- 'pending': Invited but not joined.
-- 'invited': Same as pending, let's use 'pending'.
alter table public.channel_members add column if not exists status text default 'active'; 

-- 2. Update Membership Check
-- Only 'active' members can see the chat history
create or replace function public.check_group_member(channel_id_text text)
returns boolean
language plpgsql
security definer
as $$
begin
    if channel_id_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return false;
    end if;

    return exists (
        select 1 
        from public.channel_members 
        where channel_id = channel_id_text::uuid 
        and user_id = auth.uid()
        and status = 'active' -- <--- CHANGED
    );
end;
$$;

-- 3. Update Create Group RPC
-- Creator is 'active', others are 'pending'
create or replace function public.create_new_group(
    group_name text,
    group_desc text,
    member_ids uuid[]
)
returns uuid
language plpgsql
security definer
as $$
declare
    new_channel_id uuid;
begin
    insert into public.channels (type, name, description, created_by, is_dm)
    values ('group', group_name, group_desc, auth.uid(), false)
    returning id into new_channel_id;

    -- Add Creator (Active)
    insert into public.channel_members (channel_id, user_id, role, status)
    values (new_channel_id, auth.uid(), 'owner', 'active');

    -- Add Members (Pending)
    if array_length(member_ids, 1) > 0 then
        insert into public.channel_members (channel_id, user_id, role, status)
        select new_channel_id, unnest(member_ids), 'member', 'pending';
    end if;

    return new_channel_id;
end;
$$;

-- 4. RPCs for Handling Invites
create or replace function public.respond_to_group_invite(
    p_channel_id uuid,
    accept boolean
)
returns void
language plpgsql
security definer
as $$
begin
    if accept then
        update public.channel_members
        set status = 'active'
        where channel_id = p_channel_id
        and user_id = auth.uid();
    else
        delete from public.channel_members
        where channel_id = p_channel_id
        and user_id = auth.uid();
    end if;
end;
$$;

-- 5. Helper Policy to See Pending Invites
-- We need to see channels where we are 'pending' so we can show the invite card
-- Update 'View channels' policy
drop policy if exists "View channels" on public.channels;
create policy "View channels"
    on public.channels for select
    using (
        type = 'global' 
        OR 
        created_by = auth.uid()
        OR
        exists (
            select 1 
            from public.channel_members 
            where channel_id = channels.id 
            and user_id = auth.uid()
            -- We allow seeing the channel metadata even if pending, or we can't show the name in the invite!
        )
    );
