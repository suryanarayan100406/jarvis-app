-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Public info for users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  bio text,
  is_verified boolean default false, -- For that "Gen Z" clout
  vibe_color text default 'purple', -- Custom theme per user
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- CHANNELS (Chat rooms or DMs)
create table public.channels (
  id uuid default uuid_generate_v4() primary key,
  slug text unique, -- e.g. 'general', 'random', or null for DM
  created_by uuid references public.profiles(id),
  is_dm boolean default false,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MESSAGES
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  content text,
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id), -- Nullable for anonymous? Or link to a 'guest' profile?
  -- For true anonymous, we might store a session_id or just leave user_id null
  is_anonymous boolean default false,
  anonymous_alias text, -- e.g. "Anonymous Axolotl"
  
  -- Reactions (stored as JSONB for flexibility: { "like": ["user_id_1"], "heart": [] })
  reactions jsonb default '{}'::jsonb,
  
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- REALTIME ENABLEMENT
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.profiles;

-- ROW LEVEL SECURITY (RLS)
alter table public.messages enable row level security;
alter table public.channels enable row level security;
alter table public.profiles enable row level security;

-- POLICIES (Simplified for MVP)

-- 1. Everyone can read messages (public chat for now)
create policy "Public messages are viewable by everyone"
  on public.messages for select
  using ( true );

-- 2. Authenticated users can insert messages
create policy "Users can insert their own messages"
  on public.messages for insert
  with check ( auth.uid() = user_id );

-- 3. Anonymous users can insert (if we enable anon key inserts)
-- Note: This requires Supabase "Menu > Authentication > Policies" allowing Anon role
create policy "Anonymous/Guest insert"
  on public.messages for insert
  with check ( is_anonymous = true );

-- 4. Profiles are public
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- HELPER: Handle new user signup -> create profile automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
