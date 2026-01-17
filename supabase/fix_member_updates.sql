-- FIX MEMBER UPDATES (Mute & Roles)

-- 1. Ensure 'muted' column exists
alter table public.channel_members 
add column if not exists muted boolean default false;

-- 2. Drop existing update policies to start fresh and avoid conflicts
drop policy if exists "Users can update own membership" on public.channel_members;
drop policy if exists "Admins can update members" on public.channel_members;

-- 3. Policy: Self Update (e.g. Mute)
-- Users can update their OWN row (muted status)
create policy "Users can update own membership"
    on public.channel_members for update
    using ( user_id = auth.uid() )
    with check ( user_id = auth.uid() );

-- 4. Policy: Admin Update (e.g. Promote/Demote)
-- Admins/Owners can update OTHER members in their channel
create policy "Admins can update members"
    on public.channel_members for update
    using (
        exists (
            select 1 from public.channel_members admins
            where admins.channel_id = channel_members.channel_id
            and admins.user_id = auth.uid()
            and admins.role in ('owner', 'admin')
        )
    );
