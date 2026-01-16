-- FIX ADMIN ACTIONS (Kick, Update, Invite)

-- 1. Enable UPDATE on Channels (for changing name/desc/avatar)
-- Policy: Only Owners and Admins can update
drop policy if exists "Admins can update channel info" on public.channels;
create policy "Admins can update channel info"
    on public.channels for update
    using (
        exists (
            select 1 from public.channel_members
            where channel_id = id
            and user_id = auth.uid()
            and role in ('owner', 'admin')
        )
    )
    with check (
        exists (
            select 1 from public.channel_members
            where channel_id = id
            and user_id = auth.uid()
            and role in ('owner', 'admin')
        )
    );

-- 2. Enable DELETE on Members (for Kicking and Leaving)
-- Policy: Can delete SELF (leave) OR can delete OTHERS if I am Admin/Owner
drop policy if exists "Members can leave or Admins can kick" on public.channel_members;
create policy "Members can leave or Admins can kick"
    on public.channel_members for delete
    using (
        -- Case A: Leaving (Deleting self)
        user_id = auth.uid()
        OR
        -- Case B: Kicking (Caller is Admin/Owner)
        exists (
            select 1 from public.channel_members admins
            where admins.channel_id = channel_members.channel_id
            and admins.user_id = auth.uid()
            and admins.role in ('owner', 'admin')
        )
    );

-- 3. Re-affirm Invite Generator RPC
-- Ensuring this exists and works
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

    -- Update the channel with the new slug
    update public.channels 
    set invite_slug = new_slug,
        invite_expires_at = now() + interval '7 days'
    where id = target_channel_id;

    return new_slug;
end;
$$;
