-- FIX: Run this to allow Profile Updates

-- 1. Drop existing policy if it conflicts (safe to run)
drop policy if exists "Users can update own profile" on public.profiles;

-- 2. Create the Update Policy explicitly
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- 3. Verify RLS is enabled
alter table public.profiles enable row level security;
