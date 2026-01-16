-- GROUPS INVITE SYSTEM

-- 1. Add Invite Columns to Channels
alter table public.channels add column if not exists invite_slug text unique;
alter table public.channels add column if not exists invite_expires_at timestamp with time zone;

-- 2. RPC: Generate/Regenerate Invite Link
create or replace function public.regenerate_invite_slug(
    target_channel_id uuid
)
returns text
language plpgsql
security definer
as $$
declare
    new_slug text;
    is_admin boolean;
begin
    -- Check permissions (Owner/Admin only)
    select exists (
        select 1 from public.channel_members 
        where channel_id = target_channel_id 
        and user_id = auth.uid() 
        and role in ('owner', 'admin')
    ) into is_admin;

    if not is_admin then
        raise exception 'Only admins can generate invite links';
    end if;

    -- Generate random 8-char slug
    new_slug := encode(gen_random_bytes(6), 'base64');
    new_slug := replace(new_slug, '/', '_'); -- URL safeish
    new_slug := replace(new_slug, '+', '-');

    update public.channels 
    set invite_slug = new_slug,
        invite_expires_at = now() + interval '7 days' -- Default 7 day expiry
    where id = target_channel_id;

    return new_slug;
end;
$$;

-- 3. RPC: Join via Invite
create or replace function public.join_via_invite(
    slug text
)
returns uuid
language plpgsql
security definer
as $$
declare
    target_channel_id uuid;
    already_member boolean;
begin
    -- Find channel
    select id into target_channel_id
    from public.channels 
    where invite_slug = slug
    and (invite_expires_at is null or invite_expires_at > now());

    if target_channel_id is null then
        raise exception 'Invalid or expired invite link';
    end if;

    -- Check if already member
    select exists (
        select 1 from public.channel_members
        where channel_id = target_channel_id
        and user_id = auth.uid()
    ) into already_member;

    if already_member then
        return target_channel_id; -- Just return ID to redirect
    end if;

    -- Add to members
    insert into public.channel_members (channel_id, user_id, role)
    values (target_channel_id, auth.uid(), 'member');

    return target_channel_id;
end;
$$;
