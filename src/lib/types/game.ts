export interface Game {
  id: string;
  room_id: string;
  round_number: number;
  created_at: string;
}

export interface GameScore {
  id: string;
  game_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
}

export interface YakumanRecord {
  id: string;
  game_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  yakuman_type: string;
  winning_tile: string | null;
}

export interface CompletedGame {
  game: Game;
  scores: GameScore[];
  yakumans: YakumanRecord[];
}

/** ScoreEntry → RoomDetailPage へ渡す役満入力データ */
export interface YakumanEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  yakumanType: string;
  winningTile: string | null;
}

/** ScoreEntry → RoomDetailPage へ渡す飛び/飛ばし入力データ */
export interface TobashiEntry {
  userId: string;
  displayName: string;
  type: "tobi" | "tobashi";
}
