-- ============================================================================
-- MAHJONG PEACH - 全テーブル作成スクリプト
-- 新しい Supabase プロジェクトの SQL Editor でこのファイルを実行してください
-- ============================================================================

-- 1. profiles テーブル（ユーザー名管理）
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- 2. rooms テーブル（部屋管理）
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null,
  player_count int not null check (player_count in (3, 4)),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'closed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- 同じ番号のアクティブな部屋は1つだけ
create unique index idx_unique_active_room
  on public.rooms (room_number)
  where status in ('waiting', 'active');

alter table public.rooms enable row level security;

create policy "rooms_select" on public.rooms
  for select to authenticated using (true);

create policy "rooms_insert" on public.rooms
  for insert to authenticated with check (auth.uid() = created_by);

create policy "rooms_update" on public.rooms
  for update to authenticated using (auth.uid() = created_by);

-- 3. room_members テーブル（部屋のメンバー管理）
create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null,
  joined_at timestamptz not null default now(),
  constraint unique_room_member unique (room_id, user_id)
);

create index idx_room_members_room_id on public.room_members (room_id);

alter table public.room_members enable row level security;

create policy "room_members_select" on public.room_members
  for select to authenticated using (true);

create policy "room_members_insert" on public.room_members
  for insert to authenticated with check (auth.uid() = user_id);

create policy "room_members_delete" on public.room_members
  for delete to authenticated using (auth.uid() = user_id);

-- 4. Realtime 有効化
alter publication supabase_realtime add table public.room_members;
