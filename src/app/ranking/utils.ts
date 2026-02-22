import type { PlayerData } from "@/lib/types/ranking";

export const COLORS = [
  "var(--arcoblue-6)",
  "var(--green-6)",
  "var(--orange-6)",
  "var(--red-6)",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
];

export function buildRanking(
  allScores: {
    game_id: string;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    score: number;
  }[],
  gameOrder: string[]
): PlayerData[] {
  const playerMap: Record<
    string,
    {
      displayName: string;
      avatarUrl: string | null;
      scores: Record<string, number>;
    }
  > = {};
  for (const s of allScores) {
    if (!playerMap[s.user_id]) {
      playerMap[s.user_id] = {
        displayName: s.display_name,
        avatarUrl: s.avatar_url,
        scores: {},
      };
    }
    playerMap[s.user_id].scores[s.game_id] = s.score;
  }

  const result: PlayerData[] = Object.entries(playerMap).map(([uid, data]) => {
    let cumulative = 0;
    const history: number[] = [];
    for (const gid of gameOrder) {
      if (data.scores[gid] !== undefined) {
        cumulative += data.scores[gid];
      }
      history.push(cumulative);
    }
    return {
      userId: uid,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      totalScore: cumulative,
      history,
    };
  });

  result.sort((a, b) => b.totalScore - a.totalScore);
  return result;
}
