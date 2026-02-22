export interface AchievementData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  tobashiCount: number;
  flowCount: number;
  fugouCount: number;
  yakumanCount: number;
  anteiCount: number;
  wipeoutCount: number;
  aishouName: string | null;
}

export const ACHIEVEMENTS = [
  { key: "tobashi", icon: "💥", label: "飛ばし", desc: "相手を飛ばした回数" },
  { key: "flow", icon: "🔥", label: "雀士フロー", desc: "3連続1位だった回数" },
  {
    key: "fugou",
    icon: "💰",
    label: "富豪",
    desc: "スコア100以上を記録した回数",
  },
  { key: "yakuman", icon: "🀄", label: "役満", desc: "役満を上がった回数" },
  {
    key: "antei",
    icon: "🧠",
    label: "安定",
    desc: "5連続スコアがプラスだった回数",
  },
  { key: "wipeout", icon: "👑", label: "Wipe Out", desc: "全員飛ばした回数" },
  { key: "aishou", icon: "⭕️", label: "相性", desc: "得意な相手" },
] as const;

interface ScoreRow {
  game_id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  score: number;
}

interface GameRow {
  id: string;
  created_at: string;
}

interface TobashiRow {
  game_id: string;
  user_id: string;
  type: string;
}

interface YakumanRow {
  game_id: string;
  user_id: string;
}

export function computeAchievements(
  gameIds: string[],
  gamesData: GameRow[],
  allScores: ScoreRow[],
  tobashiRecords: TobashiRow[],
  yakumanRecords: YakumanRow[]
): AchievementData[] {
  const tobashiData = tobashiRecords.filter((t) => t.type === "tobashi");
  const tobiData = tobashiRecords.filter((t) => t.type === "tobi");

  const gameMap: Record<string, ScoreRow[]> = {};
  for (const s of allScores) {
    if (!gameMap[s.game_id]) gameMap[s.game_id] = [];
    gameMap[s.game_id].push(s);
  }

  const orderedGames = gamesData
    .filter((g) => gameIds.includes(g.id))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const pd: Record<
    string,
    {
      displayName: string;
      avatarUrl: string | null;
      tobashiCount: number;
      ranks: number[];
      scores: number[];
      fugouCount: number;
      yakumanCount: number;
      wipeoutCount: number;
    }
  > = {};

  const aishouData: Record<
    string,
    Record<string, { games: number; lastCount: number }>
  > = {};

  const tobiByGame: Record<string, Set<string>> = {};
  for (const t of tobiData) {
    if (!tobiByGame[t.game_id]) tobiByGame[t.game_id] = new Set();
    tobiByGame[t.game_id].add(t.user_id);
  }

  for (const g of orderedGames) {
    const scores = gameMap[g.id];
    if (!scores) continue;
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    sorted.forEach((s, idx) => {
      if (!pd[s.user_id]) {
        pd[s.user_id] = {
          displayName: s.display_name,
          avatarUrl: s.avatar_url ?? null,
          tobashiCount: 0,
          ranks: [],
          scores: [],
          fugouCount: 0,
          yakumanCount: 0,
          wipeoutCount: 0,
        };
      }
      pd[s.user_id].ranks.push(idx + 1);
      pd[s.user_id].scores.push(s.score);
      if (s.score >= 100) pd[s.user_id].fugouCount++;
    });

    const tobiPlayers = tobiByGame[g.id];
    if (tobiPlayers && tobiPlayers.size === scores.length - 1) {
      for (const s of scores) {
        if (!tobiPlayers.has(s.user_id) && pd[s.user_id]) {
          pd[s.user_id].wipeoutCount++;
        }
      }
    }

    const firstPlace = sorted[0];
    const lastPlace = sorted[sorted.length - 1];
    if (firstPlace && lastPlace && sorted.length >= 2) {
      const me = firstPlace.user_id;
      if (!aishouData[me]) aishouData[me] = {};
      for (let i = 1; i < sorted.length; i++) {
        const opp = sorted[i].user_id;
        if (!aishouData[me][opp])
          aishouData[me][opp] = { games: 0, lastCount: 0 };
        aishouData[me][opp].games++;
        if (opp === lastPlace.user_id) {
          aishouData[me][opp].lastCount++;
        }
      }
    }
  }

  for (const t of tobashiData) {
    if (pd[t.user_id]) pd[t.user_id].tobashiCount++;
  }
  for (const y of yakumanRecords) {
    if (pd[y.user_id]) pd[y.user_id].yakumanCount++;
  }

  return Object.entries(pd).map(([uid, d]) => {
    let consecutive = 0;
    let flowCount = 0;
    for (const rank of d.ranks) {
      if (rank === 1) {
        consecutive++;
        if (consecutive === 3) {
          flowCount++;
          consecutive = 0;
        }
      } else {
        consecutive = 0;
      }
    }
    let consecutivePositive = 0;
    let anteiCount = 0;
    for (const score of d.scores) {
      if (score > 0) {
        consecutivePositive++;
        if (consecutivePositive === 5) {
          anteiCount++;
          consecutivePositive = 0;
        }
      } else {
        consecutivePositive = 0;
      }
    }
    let aishouName: string | null = null;
    const opponents = aishouData[uid];
    if (opponents) {
      let bestRate = 0;
      for (const [oppId, data] of Object.entries(opponents)) {
        if (data.games >= 10) {
          const rate = data.lastCount / data.games;
          if (rate > bestRate) {
            bestRate = rate;
            aishouName = pd[oppId]?.displayName ?? null;
          }
        }
      }
    }

    return {
      userId: uid,
      displayName: d.displayName,
      avatarUrl: d.avatarUrl,
      tobashiCount: d.tobashiCount,
      flowCount,
      fugouCount: d.fugouCount,
      yakumanCount: d.yakumanCount,
      anteiCount,
      wipeoutCount: d.wipeoutCount,
      aishouName,
    };
  });
}
