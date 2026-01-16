-- FIX AMBIGUOUS COLUMN REFERENCE
-- Issue: 'slug' param clashed with 'slug' (or similar) column in channels table.
-- Fix: Rename param to 'p_invite_slug'
-- Error Fix: Must DROP first because param name changed

drop function if exists public.join_via_invite(text);

create or replace function public.join_via_invite(
    p_invite_slug text
)
returns uuid
language plpgsql
security definer
as $$
declare
    target_channel_id uuid;
    already_member boolean;
begin
    -- Find channel matching the invite slug
    select id into target_channel_id
    from public.channels 
    where invite_slug = p_invite_slug -- Now clear: column = param
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
        return target_channel_id;
    end if;

    -- Add to members
    insert into public.channel_members (channel_id, user_id, role)
    values (target_channel_id, auth.uid(), 'member');

    return target_channel_id;
end;
$$;
