-- ROBUST UNREAD SYSTEM FIX

-- 1. Drop old function to be sure
drop function if exists public.get_sidebar_stats();

-- 2. Re-create function with explicit SECURITY DEFINER and casting
create or replace function public.get_sidebar_stats()
returns table (
    friend_id uuid,
    unread_count bigint
) 
language plpgsql 
security definer -- Runs as admin to ensure we can read all necessary tables
set search_path = public -- Best practice for security definer
as $$
declare
    current_uid uuid;
begin
    current_uid := auth.uid();

    -- Return empty if not logged in
    if current_uid is null then
        return;
    end if;

    return query
    with my_friends as (
        -- Select friends. Since we are Security Definer, we see all rows in friends_view.
        -- We MUST filter by current_uid.
        select friend_id from public.friends_view where user_id = current_uid
    ),
    friend_channels as (
        select 
            f.friend_id,
            -- Explicit casting to ensure UUIDs concatenate correctly as text strings
            case 
                when current_uid < f.friend_id then 'dm_' || current_uid::text || '_' || f.friend_id::text
                else 'dm_' || f.friend_id::text || '_' || current_uid::text
            end as channel_id
        from my_friends f
    ),
    read_status as (
        select channel_id, last_read_at 
        from public.user_last_read 
        where user_id = current_uid
    )
    select 
        fc.friend_id,
        count(m.id) as unread_count
    from friend_channels fc
    left join read_status rs on rs.channel_id = fc.channel_id
    left join public.messages m on 
        m.channel_id = fc.channel_id 
        and m.user_id != current_uid -- Count messages from OTHERS
        and m.inserted_at > coalesce(rs.last_read_at, '1970-01-01') -- Count only new messages
    group by fc.friend_id;
end;
$$;

-- 3. Grant permission to authenticated users
grant execute on function public.get_sidebar_stats() to authenticated;
