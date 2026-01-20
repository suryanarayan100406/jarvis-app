-- 1. Add columns to messages table (Safe to re-run)
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_type text;

-- 2. Create Storage Bucket (chat-media)
-- Note: 'storage.buckets' is a system table managed by Supabase Storage
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- 3. Storage Policies

-- IMPORTANT: We removed the "alter table storage.objects enable row level security" 
-- because it causes permission errors (42501) and is usually enabled by default.

-- Drop existing policies first to allow safe re-running of this script
drop policy if exists "Authenticated users can upload chat media" on storage.objects;
drop policy if exists "Anyone can read chat media" on storage.objects;
drop policy if exists "Users can delete their own media" on storage.objects;

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

-- Policy: Users can delete their own media
create policy "Users can delete their own media"
on storage.objects for delete
to authenticated
using ( bucket_id = 'chat-media' and auth.uid() = owner );
