import type { RoomMember } from "@/lib/types/room";
import type { CompletedGame } from "@/lib/types/game";
import type { AchievementData } from "@/lib/achievements";

export const MEMBERS: RoomMember[] = [
  {
    id: "m1",
    room_id: "room1",
    user_id: "u1",
    display_name: "山田太郎",
    avatar_url: null,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "m2",
    room_id: "room1",
    user_id: "u2",
    display_name: "鈴木花子",
    avatar_url: null,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "m3",
    room_id: "room1",
    user_id: "u3",
    display_name: "田中一郎",
    avatar_url: null,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "m4",
    room_id: "room1",
    user_id: "u4",
    display_name: "佐藤二郎",
    avatar_url: null,
    joined_at: "2024-01-01T00:00:00Z",
  },
];

export const COMPLETED_GAMES: CompletedGame[] = [
  {
    game: {
      id: "g1",
      room_id: "room1",
      round_number: 1,
      created_at: "2024-01-01T10:00:00Z",
    },
    scores: [
      {
        id: "s1",
        game_id: "g1",
        user_id: "u1",
        display_name: "山田太郎",
        avatar_url: null,
        score: 50,
      },
      {
        id: "s2",
        game_id: "g1",
        user_id: "u2",
        display_name: "鈴木花子",
        avatar_url: null,
        score: -10,
      },
      {
        id: "s3",
        game_id: "g1",
        user_id: "u3",
        display_name: "田中一郎",
        avatar_url: null,
        score: -20,
      },
      {
        id: "s4",
        game_id: "g1",
        user_id: "u4",
        display_name: "佐藤二郎",
        avatar_url: null,
        score: -20,
      },
    ],
    yakumans: [],
  },
  {
    game: {
      id: "g2",
      room_id: "room1",
      round_number: 2,
      created_at: "2024-01-01T11:00:00Z",
    },
    scores: [
      {
        id: "s5",
        game_id: "g2",
        user_id: "u1",
        display_name: "山田太郎",
        avatar_url: null,
        score: -30,
      },
      {
        id: "s6",
        game_id: "g2",
        user_id: "u2",
        display_name: "鈴木花子",
        avatar_url: null,
        score: 80,
      },
      {
        id: "s7",
        game_id: "g2",
        user_id: "u3",
        display_name: "田中一郎",
        avatar_url: null,
        score: 10,
      },
      {
        id: "s8",
        game_id: "g2",
        user_id: "u4",
        display_name: "佐藤二郎",
        avatar_url: null,
        score: -60,
      },
    ],
    yakumans: [],
  },
];

export const COMPLETED_GAMES_WITH_YAKUMAN: CompletedGame[] = [
  {
    ...COMPLETED_GAMES[0],
    yakumans: [
      {
        id: "y1",
        game_id: "g1",
        user_id: "u1",
        display_name: "山田太郎",
        avatar_url: null,
        yakuman_type: "国士無双",
        winning_tile: "1m",
      },
    ],
  },
  COMPLETED_GAMES[1],
];

export const ACHIEVEMENT_DATA: AchievementData = {
  userId: "u1",
  displayName: "山田太郎",
  avatarUrl: null,
  tobashiCount: 3,
  flowCount: 1,
  fugouCount: 2,
  yakumanCount: 1,
  anteiCount: 0,
  wipeoutCount: 1,
  aishouName: null,
};
