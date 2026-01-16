-- COMPREHENSIVE FIX (Run this to fix Profile + Uploads)

-- 1. Reset Policies for Profiles to be clean
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;

-- 2. Allow Public Read (View)
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

-- 3. Allow Users to INSERT (Create) their own profile
-- (Essential if the automatic trigger failed or you signed up earlier)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- 4. Allow Users to UPDATE (Edit) their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- 5. Ensure RLS is on
alter table public.profiles enable row level security;