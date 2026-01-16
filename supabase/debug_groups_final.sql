-- DEBUG SCRIPT: Check Groups and Members

-- 1. Check if any 'group' type channels exist
select id, name, type, created_by, inserted_at 
from public.channels 
where type = 'group'
order by inserted_at desc;

-- 2. Check members of those groups
select cm.channel_id, cm.user_id, cm.role, p.username 
from public.channel_members cm
join public.profiles p on p.id = cm.user_id
join public.channels c on c.id = cm.channel_id
where c.type = 'group';

-- 3. Check RLS Policies on channels
select * from pg_policies where tablename = 'channels';

-- 4. Check specific user visibility (simulate if possible, otherwise just review policy)
-- The policy "View channels" relies on `exists (select 1 from channel_members...)`
-- If step 2 shows memberships but user can't see, then policy is broken.
