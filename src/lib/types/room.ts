export type RoomStatus = "waiting" | "active" | "closed";

export interface Room {
  id: string;
  room_number: string;
  player_count: 3 | 4;
  pt_rate: number;
  status: RoomStatus;
  created_by: string;
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
}
