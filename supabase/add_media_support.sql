-- 1. Add columns to messages table
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_type text; -- 'image/png', 'video/mp4', 'file', etc.

-- 2. Create Storage Bucket (chat-media)
-- Note: 'storage.buckets' is a system table managed by Supabase Storage
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- 3. Storage Policies
-- Enable RLS on objects if not already (it usually is)
alter table storage.objects enable row level security;

-- Policy: Authenticated users can upload media
create policy "Authenticated users can upload chat media"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'chat-media' );

-- Policy: Everyone can read media (since bucket is public)
create policy "Anyone can read chat media"
on storage.objects for select
to public
using ( bucket_id = 'chat-media' );

-- Policy: Users can delete their own media (Optional but good)
create policy "Users can delete their own media"
on storage.objects for delete
to authenticated
using ( bucket_id = 'chat-media' and auth.uid() = owner );
