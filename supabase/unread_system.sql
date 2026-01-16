-- UNREAD MESSAGES SYSTEM

-- 1. Create table to track when a user last read a channel
create table public.user_last_read (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) not null,
    channel_id text not null,
    last_read_at timestamp with time zone default now(),
    
    unique(user_id, channel_id)
);

-- 2. RLS for this table
alter table public.user_last_read enable row level security;

create policy "Users can manage their own read status"
    on public.user_last_read
    for all
    using ( auth.uid() = user_id )
    with check ( auth.uid() = user_id );

-- 3. The Magic RPC Function
-- This calculates unread counts efficiently on the server
create or replace function public.get_sidebar_stats()
returns table (
    friend_id uuid,
    unread_count bigint
) 
language plpgsql security definer
as $$
declare
    current_uid uuid;
begin
    current_uid := auth.uid();

    return query
    with my_friends as (
        select friend_id from public.friends_view where user_id = current_uid
    ),
    friend_channels as (
        select 
            f.friend_id,
            -- Re-implement deterministic channel ID logic in SQL
            case 
                when current_uid < f.friend_id then 'dm_' || current_uid || '_' || f.friend_id
                else 'dm_' || f.friend_id || '_' || current_uid
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
        and m.user_id != current_uid -- Only count messages from others
        and m.inserted_at > coalesce(rs.last_read_at, '1970-01-01') -- Newer than last read
    group by fc.friend_id;
end;
$$;
