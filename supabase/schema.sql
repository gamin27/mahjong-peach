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
  pt_rate int not null default 50,
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

-- 4. games テーブル（各半荘の記録）
create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number int not null,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games_select" on public.games
  for select to authenticated using (true);

create policy "games_insert" on public.games
  for insert to authenticated with check (true);

-- 5. game_scores テーブル（各半荘の各プレイヤーの点数）
create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null,
  score int not null,
  created_at timestamptz not null default now()
);

alter table public.game_scores enable row level security;

create policy "game_scores_select" on public.game_scores
  for select to authenticated using (true);

create policy "game_scores_insert" on public.game_scores
  for insert to authenticated with check (true);

create policy "game_scores_update" on public.game_scores
  for update to authenticated using (true) with check (true);

-- 6. Supabase Storage（avatars バケット）
-- Supabase ダッシュボードで avatars バケットを public で作成してください
-- または以下の SQL を実行:
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- 7. Realtime 有効化
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.game_scores;

-- 8. yakuman_records テーブル（役満記録）
create table public.yakuman_records (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null,
  avatar_url text,
  yakuman_type text not null,
  winning_tile text not null,
  created_at timestamptz not null default now()
);

alter table public.yakuman_records enable row level security;

create policy "yakuman_records_select" on public.yakuman_records
  for select to authenticated using (true);

create policy "yakuman_records_insert" on public.yakuman_records
  for insert to authenticated with check (true);

-- 9. tobashi_records テーブル（飛ばし記録）
create table public.tobashi_records (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  type text not null check (type in ('tobi', 'tobashi')),
  created_at timestamptz not null default now()
);

alter table public.tobashi_records enable row level security;

create policy "tobashi_records_select" on public.tobashi_records
  for select to authenticated using (true);

create policy "tobashi_records_insert" on public.tobashi_records
  for insert to authenticated with check (true);

-- 10. マイグレーション: avatar_url カラム追加
-- 既存DBに対して実行:
-- ALTER TABLE public.profiles ADD COLUMN avatar_url text;
-- ALTER TABLE public.room_members ADD COLUMN avatar_url text;
-- ALTER TABLE public.game_scores ADD COLUMN avatar_url text;

-- 10. Realtime: rooms テーブル追加（解散通知用）
alter publication supabase_realtime add table public.rooms;

-- 11. RPC: ホーム画面サマリー取得（パフォーマンス改善）
-- Supabase SQL Editor で実行してください
CREATE OR REPLACE FUNCTION get_home_stats(p_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  WITH my_game_ids AS (
    SELECT DISTINCT game_id FROM game_scores WHERE user_id = p_user_id
  ),
  scored AS (
    SELECT
      gs.game_id,
      gs.user_id,
      gs.score,
      gs.created_at,
      COUNT(*) OVER (PARTITION BY gs.game_id) AS player_count,
      RANK() OVER (PARTITION BY gs.game_id ORDER BY gs.score DESC) AS rank
    FROM game_scores gs
    JOIN my_game_ids mg ON gs.game_id = mg.game_id
  ),
  my_ranks AS (
    SELECT game_id, score, created_at, player_count, rank
    FROM scored
    WHERE user_id = p_user_id
  ),
  yakuman_set AS (
    SELECT DISTINCT yr.game_id
    FROM yakuman_records yr
    JOIN my_game_ids mg ON yr.game_id = mg.game_id
  ),
  ranked_with_yakuman AS (
    SELECT
      mr.*,
      EXISTS(SELECT 1 FROM yakuman_set ys WHERE ys.game_id = mr.game_id) AS has_yakuman
    FROM my_ranks mr
  ),
  stats AS (
    SELECT
      player_count,
      COUNT(*)::int AS total_games,
      SUM(score)::int AS total_score,
      ROUND(AVG(rank), 2) AS avg_rank,
      COUNT(*) FILTER (WHERE rank = 1)::int AS rank1,
      COUNT(*) FILTER (WHERE rank = 2)::int AS rank2,
      COUNT(*) FILTER (WHERE rank = 3)::int AS rank3,
      COUNT(*) FILTER (WHERE rank = 4)::int AS rank4
    FROM ranked_with_yakuman
    GROUP BY player_count
  ),
  history AS (
    SELECT
      player_count,
      json_agg(
        json_build_object('rank', rank, 'hasYakuman', has_yakuman)
        ORDER BY created_at
      ) AS rank_history
    FROM ranked_with_yakuman
    GROUP BY player_count
  )
  SELECT json_build_object(
    'stats', COALESCE((SELECT json_agg(row_to_json(s)) FROM stats s), '[]'::json),
    'history', COALESCE((SELECT json_object_agg(h.player_count, h.rank_history) FROM history h), '{}'::json)
  );
$$;
