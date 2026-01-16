-- ADD MUTED COLUMN TO CHANNEL MEMBERS
alter table public.channel_members 
add column if not exists muted boolean default false;

-- RLS should already cover update if "Users can update their own member status" exists.
-- Let's ensure a policy exists for users to update their OWN membership (e.g. mute).

create policy "Users can update own membership"
    on public.channel_members for update
    using ( user_id = auth.uid() )
    with check ( user_id = auth.uid() );
