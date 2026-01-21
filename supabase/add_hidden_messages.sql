-- Table to track messages deleted by specific users (Delete for Me)
create table if not exists public.hidden_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  message_id uuid references public.messages(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, message_id)
);

-- RLS
alter table public.hidden_messages enable row level security;

create policy "Users can insert their own hidden messages"
  on public.hidden_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own hidden messages"
  on public.hidden_messages for select
  using (auth.uid() = user_id);
