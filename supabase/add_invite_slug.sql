-- 1. Add invite_slug to channels if not exists
alter table public.channels add column if not exists invite_slug text unique;

-- 2. Function to regenerate slug (Admin Only)
create or replace function public.regenerate_invite_slug(target_channel_id uuid)
returns text
language plpgsql
security definer
as $$
declare
    new_slug text;
    is_admin boolean;
begin
    -- Check permissions (Owner or Admin)
    select exists (
        select 1 from public.channel_members
        where channel_id = target_channel_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    ) into is_admin;

    if not is_admin then
        raise exception 'Access denied: You must be an admin to manage invites.';
    end if;

    -- Generate random slug (using md5 of random, take first 10 chars)
    new_slug := substring(md5(random()::text || clock_timestamp()::text) from 1 for 10);

    -- Update channel
    update public.channels
    set invite_slug = new_slug
    where id = target_channel_id;

    return new_slug;
end;
$$;

-- 3. Function to get channel details by slug (Public Access allowed for this specific query)
-- We use SECURITY DEFINER to allow fetching specific public fields even if not a member yet.
create or replace function public.get_channel_by_slug(slug_param text)
returns table (
    id uuid,
    name text,
    description text,
    image_url text,
    member_count bigint
)
language plpgsql
security definer
as $$
begin
    return query
    select 
        c.id,
        c.name,
        c.description,
        c.image_url,
        (select count(*) from public.channel_members cm where cm.channel_id = c.id) as member_count
    from public.channels c
    where c.invite_slug = slug_param;
end;
$$;

-- 4. Function to JOIN via slug
create or replace function public.join_channel_via_slug(slug_param text)
returns uuid
language plpgsql
security definer
as $$
declare
    target_channel_id uuid;
    current_membership text;
begin
    -- Find channel
    select id into target_channel_id
    from public.channels
    where invite_slug = slug_param;

    if target_channel_id is null then
        raise exception 'Invalid invite link.';
    end if;

    -- Check if already member
    select role into current_membership
    from public.channel_members
    where channel_id = target_channel_id
    and user_id = auth.uid();

    if current_membership is not null then
        return target_channel_id; -- Already member, just return ID
    end if;

    -- Insert new member
    insert into public.channel_members (channel_id, user_id, role, status)
    values (target_channel_id, auth.uid(), 'member', 'active');

    return target_channel_id;
end;
$$;
