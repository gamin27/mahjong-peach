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
  score: number;
}

export interface CompletedGame {
  game: Game;
  scores: GameScore[];
}
