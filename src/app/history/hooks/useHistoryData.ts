import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CompletedGame } from "@/lib/types/game";
import { computeAchievements } from "@/lib/achievements";
import type { AchievementData } from "@/lib/achievements";
import type { HistoryUI } from "./useHistoryUI";

export interface PlayerStats {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalGames: number;
  topRate: number;
  lastRate: number;
  avgRank: number;
  tobiRate: number;
}

export interface YakumanItem {
  displayName: string;
  avatarUrl: string | null;
  yakumanType: string;
  winningTile: string;
  date: string;
}

export interface SessionData {
  roomId: string;
  date: string;
  games: CompletedGame[];
  ptRate: number;
}

interface GameMeta {
  id: string;
  room_id: string;
  round_number: number;
  created_at: string;
}

export interface InitResult {
  years: number[];
  initialYear: number;
  initialTab: 3 | 4;
}

const PAGE_SIZE = 5;

export function useHistoryData(ui: HistoryUI) {
  const supabase = createClient();

  const [players3, setPlayers3] = useState<PlayerStats[]>([]);
  const [players4, setPlayers4] = useState<PlayerStats[]>([]);
  const [yakumans3, setYakumans3] = useState<YakumanItem[]>([]);
  const [yakumans4, setYakumans4] = useState<YakumanItem[]>([]);
  const [sessions3, setSessions3] = useState<SessionData[]>([]);
  const [sessions4, setSessions4] = useState<SessionData[]>([]);
  const [achievements3, setAchievements3] = useState<AchievementData[]>([]);
  const [achievements4, setAchievements4] = useState<AchievementData[]>([]);

  const metaRef = useRef<{
    gamesData: GameMeta[];
    gamePlayerCount: Record<string, number>;
  } | null>(null);

  const fetchedRef = useRef(new Set<string>());

  const gamesMetaRef = useRef<
    Record<
      string,
      { rooms: string[]; loaded: number; roomGameIds: Record<string, string[]> }
    >
  >({});

  const [initResult, setInitResult] = useState<InitResult | null>(null);

  // ---- ヘルパー ----

  const updateProfiles = async (
    scores: Array<{
      user_id: string;
      display_name: string;
      avatar_url: string | null;
    }>,
  ) => {
    const userIds = [...new Set(scores.map((s) => s.user_id))];
    if (userIds.length === 0) return;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);
    if (profiles) {
      const profileMap: Record<
        string,
        { username: string; avatar_url: string | null }
      > = {};
      for (const p of profiles) profileMap[p.id] = p;
      for (const s of scores) {
        const prof = profileMap[s.user_id];
        if (prof) {
          s.display_name = prof.username;
          s.avatar_url = prof.avatar_url;
        }
      }
    }
  };

  // ---- タブ別fetch ----

  const fetchSummary = async (year: number, playerCount: 3 | 4) => {
    const meta = metaRef.current;
    if (!meta) return;

    ui.setTabLoading(true);

    const yearGameIds = meta.gamesData
      .filter(
        (g) =>
          new Date(g.created_at).getFullYear() === year &&
          meta.gamePlayerCount[g.id] === playerCount,
      )
      .map((g) => g.id);

    const setPlayers = playerCount === 3 ? setPlayers3 : setPlayers4;
    const setYakumans = playerCount === 3 ? setYakumans3 : setYakumans4;

    if (yearGameIds.length === 0) {
      setPlayers([]);
      setYakumans([]);
      fetchedRef.current.add(`summary:${year}:${playerCount}`);
      ui.setTabLoading(false);
      return;
    }

    const [yearScoresRes, yakumanRes] = await Promise.all([
      supabase
        .from("game_scores")
        .select("user_id")
        .in("game_id", yearGameIds),
      supabase
        .from("yakuman_records")
        .select(
          "game_id, user_id, display_name, avatar_url, yakuman_type, winning_tile, created_at",
        )
        .in("game_id", yearGameIds),
    ]);

    const playerIds = [
      ...new Set(yearScoresRes.data?.map((s) => s.user_id) || []),
    ];
    if (playerIds.length === 0) {
      setPlayers([]);
      setYakumans([]);
      fetchedRef.current.add(`summary:${year}:${playerCount}`);
      ui.setTabLoading(false);
      return;
    }

    const { data: playerGameRows } = await supabase
      .from("game_scores")
      .select("game_id")
      .in("user_id", playerIds);

    const allGameIdsFromPlayers = [
      ...new Set(playerGameRows?.map((r) => r.game_id) || []),
    ];

    const knownGameIds = new Set(meta.gamesData.map((g) => g.id));
    const additionalGameIds = allGameIdsFromPlayers.filter(
      (id) => !knownGameIds.has(id),
    );

    const [additionalGamesRes, countRes] = await Promise.all([
      additionalGameIds.length > 0
        ? supabase
            .from("games")
            .select("id, created_at")
            .in("id", additionalGameIds)
        : Promise.resolve({
            data: [] as { id: string; created_at: string }[],
          }),
      supabase
        .from("game_scores")
        .select("game_id")
        .in("game_id", allGameIdsFromPlayers),
    ]);

    const gameYearMap: Record<string, number> = {};
    for (const g of meta.gamesData)
      gameYearMap[g.id] = new Date(g.created_at).getFullYear();
    for (const g of additionalGamesRes.data || [])
      gameYearMap[g.id] = new Date(g.created_at).getFullYear();

    const gpc: Record<string, number> = {};
    for (const row of countRes.data || []) {
      gpc[row.game_id] = (gpc[row.game_id] || 0) + 1;
    }

    const filteredGameIds = allGameIdsFromPlayers.filter(
      (id) => gameYearMap[id] === year && gpc[id] === playerCount,
    );

    if (filteredGameIds.length === 0) {
      setPlayers([]);
      const yakumanData = yakumanRes.data || [];
      setYakumans(
        yakumanData.map((y) => ({
          displayName: y.display_name,
          avatarUrl: y.avatar_url,
          yakumanType: y.yakuman_type,
          winningTile: y.winning_tile,
          date: y.created_at,
        })),
      );
      fetchedRef.current.add(`summary:${year}:${playerCount}`);
      ui.setTabLoading(false);
      return;
    }

    const [fullScoresRes, tobiRes] = await Promise.all([
      supabase
        .from("game_scores")
        .select("game_id, user_id, display_name, avatar_url, score")
        .in("game_id", filteredGameIds),
      supabase
        .from("tobashi_records")
        .select("game_id, user_id")
        .in("game_id", filteredGameIds)
        .eq("type", "tobi"),
    ]);

    const fullScores = fullScoresRes.data || [];
    const tobiData = tobiRes.data || [];

    await updateProfiles(fullScores);

    const gameMap: Record<string, typeof fullScores> = {};
    for (const s of fullScores) {
      if (!gameMap[s.game_id]) gameMap[s.game_id] = [];
      gameMap[s.game_id].push(s);
    }

    const tobiSet = new Set<string>();
    for (const t of tobiData) tobiSet.add(`${t.game_id}:${t.user_id}`);

    const stats: Record<
      string,
      {
        displayName: string;
        avatarUrl: string | null;
        games: number;
        topCount: number;
        lastCount: number;
        rankSum: number;
        tobiCount: number;
      }
    > = {};
    for (const [gameId, scores] of Object.entries(gameMap)) {
      const sorted = [...scores].sort((a, b) => b.score - a.score);
      sorted.forEach((s, idx) => {
        if (!stats[s.user_id]) {
          stats[s.user_id] = {
            displayName: s.display_name,
            avatarUrl: s.avatar_url,
            games: 0,
            topCount: 0,
            lastCount: 0,
            rankSum: 0,
            tobiCount: 0,
          };
        }
        const st = stats[s.user_id];
        st.games++;
        const rank = idx + 1;
        st.rankSum += rank;
        if (rank === 1) st.topCount++;
        if (rank === playerCount) st.lastCount++;
        if (tobiSet.has(`${gameId}:${s.user_id}`)) st.tobiCount++;
      });
    }

    const coPlayerSet = new Set(playerIds);
    setPlayers(
      Object.entries(stats)
        .filter(([uid]) => coPlayerSet.has(uid))
        .map(([uid, st]) => ({
          userId: uid,
          displayName: st.displayName,
          avatarUrl: st.avatarUrl,
          totalGames: st.games,
          topRate: (st.topCount / st.games) * 100,
          lastRate: (st.lastCount / st.games) * 100,
          avgRank: st.rankSum / st.games,
          tobiRate: (st.tobiCount / st.games) * 100,
        }))
        .sort((a, b) => a.avgRank - b.avgRank),
    );

    const yakumanData = yakumanRes.data || [];
    setYakumans(
      yakumanData.map((y) => ({
        displayName: y.display_name,
        avatarUrl: y.avatar_url,
        yakumanType: y.yakuman_type,
        winningTile: y.winning_tile,
        date: y.created_at,
      })),
    );

    fetchedRef.current.add(`summary:${year}:${playerCount}`);
    ui.setTabLoading(false);
  };

  const loadMoreGames = async (year: number, playerCount: 3 | 4) => {
    const meta = metaRef.current;
    const key = `${year}:${playerCount}`;
    const gamesMeta = gamesMetaRef.current[key];
    if (!meta || !gamesMeta) return;

    const nextRooms = gamesMeta.rooms.slice(
      gamesMeta.loaded,
      gamesMeta.loaded + PAGE_SIZE,
    );
    if (nextRooms.length === 0) return;

    const gameIds = nextRooms.flatMap(
      (roomId) => gamesMeta.roomGameIds[roomId] || [],
    );
    if (gameIds.length === 0) return;

    const [scoresRes, yakumanRes, roomsRes] = await Promise.all([
      supabase
        .from("game_scores")
        .select("id, game_id, user_id, display_name, avatar_url, score")
        .in("game_id", gameIds),
      supabase
        .from("yakuman_records")
        .select(
          "game_id, user_id, display_name, avatar_url, yakuman_type, winning_tile",
        )
        .in("game_id", gameIds),
      supabase.from("rooms").select("id, pt_rate").in("id", nextRooms),
    ]);

    const scores = scoresRes.data || [];
    const yakumanData = yakumanRes.data || [];
    const roomsData = roomsRes.data || [];

    await updateProfiles(scores);

    const roomPtRates: Record<string, number> = {};
    for (const r of roomsData) roomPtRates[r.id] = r.pt_rate;

    const newSessions: SessionData[] = [];
    for (const roomId of nextRooms) {
      const roomGames = meta.gamesData
        .filter(
          (g) =>
            g.room_id === roomId &&
            gamesMeta.roomGameIds[roomId]?.includes(g.id),
        )
        .sort((a, b) => a.round_number - b.round_number);

      const games: CompletedGame[] = roomGames.map((g) => ({
        game: {
          id: g.id,
          room_id: g.room_id,
          round_number: g.round_number,
          created_at: g.created_at,
        },
        scores: scores
          .filter((s) => s.game_id === g.id)
          .map((s) => ({
            id: s.id,
            game_id: s.game_id,
            user_id: s.user_id,
            display_name: s.display_name,
            avatar_url: s.avatar_url,
            score: s.score,
          })),
        yakumans: yakumanData
          .filter((yy) => yy.game_id === g.id)
          .map((yy) => ({
            id: yy.game_id + yy.display_name,
            game_id: yy.game_id,
            user_id: yy.user_id,
            display_name: yy.display_name,
            avatar_url: yy.avatar_url,
            yakuman_type: yy.yakuman_type,
            winning_tile: yy.winning_tile,
          })),
      }));

      if (games.length > 0) {
        newSessions.push({
          roomId,
          date: roomGames[0].created_at,
          games,
          ptRate: roomPtRates[roomId] ?? 50,
        });
      }
    }

    const setSessions = playerCount === 3 ? setSessions3 : setSessions4;
    setSessions((prev) => [...prev, ...newSessions]);
    gamesMeta.loaded += PAGE_SIZE;
  };

  const fetchGames = async (year: number, playerCount: 3 | 4) => {
    const meta = metaRef.current;
    if (!meta) return;

    ui.setTabLoading(true);

    const yearGames = meta.gamesData.filter(
      (g) =>
        new Date(g.created_at).getFullYear() === year &&
        meta.gamePlayerCount[g.id] === playerCount,
    );

    const roomInfo: Record<string, { date: string; gameIds: string[] }> = {};
    for (const g of yearGames) {
      if (!roomInfo[g.room_id]) {
        roomInfo[g.room_id] = { date: g.created_at, gameIds: [] };
      }
      roomInfo[g.room_id].gameIds.push(g.id);
      if (new Date(g.created_at) > new Date(roomInfo[g.room_id].date)) {
        roomInfo[g.room_id].date = g.created_at;
      }
    }

    const rooms = Object.entries(roomInfo)
      .sort(
        (a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime(),
      )
      .map(([roomId]) => roomId);

    const roomGameIds: Record<string, string[]> = {};
    for (const [roomId, info] of Object.entries(roomInfo)) {
      roomGameIds[roomId] = info.gameIds;
    }

    const key = `${year}:${playerCount}`;
    gamesMetaRef.current[key] = { rooms, loaded: 0, roomGameIds };

    const setSessions = playerCount === 3 ? setSessions3 : setSessions4;
    setSessions([]);

    await loadMoreGames(year, playerCount);

    fetchedRef.current.add(`games:${year}:${playerCount}`);
    ui.setTabLoading(false);
  };

  const fetchAchievements = async (year: number, playerCount: 3 | 4) => {
    const meta = metaRef.current;
    if (!meta) return;

    ui.setTabLoading(true);

    const setAch = playerCount === 3 ? setAchievements3 : setAchievements4;

    const yearGameIds = meta.gamesData
      .filter(
        (g) =>
          new Date(g.created_at).getFullYear() === year &&
          meta.gamePlayerCount[g.id] === playerCount,
      )
      .map((g) => g.id);

    if (yearGameIds.length === 0) {
      setAch([]);
      fetchedRef.current.add(`achievements:${year}:${playerCount}`);
      ui.setTabLoading(false);
      return;
    }

    const [scoresRes, tobashiAllRes, yakumanRes] = await Promise.all([
      supabase
        .from("game_scores")
        .select("game_id, user_id, display_name, avatar_url, score")
        .in("game_id", yearGameIds),
      supabase
        .from("tobashi_records")
        .select("game_id, user_id, type")
        .in("game_id", yearGameIds),
      supabase
        .from("yakuman_records")
        .select("game_id, user_id")
        .in("game_id", yearGameIds),
    ]);

    const allScores = scoresRes.data || [];
    const allTobashiRecords = tobashiAllRes.data || [];
    const yakumanData = yakumanRes.data || [];

    await updateProfiles(allScores);

    const all = computeAchievements(
      yearGameIds,
      meta.gamesData,
      allScores,
      allTobashiRecords,
      yakumanData,
    );

    setAch(
      all
        .filter(
          (a) =>
            a.tobashiCount > 0 ||
            a.flowCount > 0 ||
            a.fugouCount > 0 ||
            a.yakumanCount > 0 ||
            a.anteiCount > 0 ||
            a.wipeoutCount > 0 ||
            a.aishouName !== null,
        )
        .sort((a, b) => {
          const totalA =
            a.tobashiCount +
            a.flowCount +
            a.fugouCount +
            a.yakumanCount +
            a.anteiCount +
            a.wipeoutCount;
          const totalB =
            b.tobashiCount +
            b.flowCount +
            b.fugouCount +
            b.yakumanCount +
            b.anteiCount +
            b.wipeoutCount;
          return totalB - totalA;
        }),
    );

    fetchedRef.current.add(`achievements:${year}:${playerCount}`);
    ui.setTabLoading(false);
  };

  // ---- スコア編集（admin用） ----

  const handleUpdateScores = async (
    playerCount: 3 | 4,
    roomId: string,
    gameIndex: number,
    scores: { userId: string; score: number }[],
  ) => {
    const setSessions = playerCount === 3 ? setSessions3 : setSessions4;
    const sessions = playerCount === 3 ? sessions3 : sessions4;
    const session = sessions.find((s) => s.roomId === roomId);
    if (!session) return;
    const game = session.games[gameIndex];
    if (!game) return;

    // 楽観的更新
    setSessions((prev) =>
      prev.map((s) => {
        if (s.roomId !== roomId) return s;
        return {
          ...s,
          games: s.games.map((g, i) => {
            if (i !== gameIndex) return g;
            return {
              ...g,
              scores: g.scores.map((sc) => {
                const updated = scores.find((u) => u.userId === sc.user_id);
                return updated ? { ...sc, score: updated.score } : sc;
              }),
            };
          }),
        };
      }),
    );

    // DB更新
    for (const s of scores) {
      const row = game.scores.find((sc) => sc.user_id === s.userId);
      if (!row) continue;
      const { data, error } = await supabase
        .from("game_scores")
        .update({ score: s.score })
        .eq("id", row.id)
        .select();
      if (error) {
        console.error("score update failed:", error);
      } else if (!data || data.length === 0) {
        await supabase
          .from("game_scores")
          .update({ score: s.score })
          .eq("game_id", game.game.id)
          .eq("user_id", s.userId);
      }
    }
  };

  // ---- 初回ロード ----

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, is_admin")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        ui.setAvatarUrl(profile.avatar_url);
        ui.setUsername(profile.username);
        if (profile.is_admin) ui.setIsAdmin(true);
      }

      const { data: myRooms } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", session.user.id);
      if (!myRooms || myRooms.length === 0) {
        ui.setLoading(false);
        return;
      }
      const roomIds = [...new Set(myRooms.map((r) => r.room_id))];

      const gamesRes = await supabase
        .from("games")
        .select("id, room_id, round_number, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: true });

      const allGameIds = gamesRes.data?.map((g) => g.id) ?? [];
      if (allGameIds.length === 0) {
        ui.setLoading(false);
        return;
      }

      const countsRes = await supabase
        .from("game_scores")
        .select("game_id")
        .in("game_id", allGameIds);

      const gamesData = gamesRes.data;
      if (!gamesData) {
        ui.setLoading(false);
        return;
      }

      const gamePlayerCount: Record<string, number> = {};
      if (countsRes.data) {
        for (const row of countsRes.data) {
          gamePlayerCount[row.game_id] =
            (gamePlayerCount[row.game_id] || 0) + 1;
        }
      }

      metaRef.current = { gamesData, gamePlayerCount };

      const years = [
        ...new Set(gamesData.map((g) => new Date(g.created_at).getFullYear())),
      ].sort((a, b) => b - a);
      const initialYear = years[0] || new Date().getFullYear();

      const has3 = gamesData.some(
        (g) =>
          new Date(g.created_at).getFullYear() === initialYear &&
          gamePlayerCount[g.id] === 3,
      );
      const has4 = gamesData.some(
        (g) =>
          new Date(g.created_at).getFullYear() === initialYear &&
          gamePlayerCount[g.id] === 4,
      );
      const initialTab: 3 | 4 = has3 ? 3 : has4 ? 4 : 3;

      setInitResult({ years, initialYear, initialTab });
      ui.setLoading(false);

      await fetchSummary(initialYear, initialTab);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    players3,
    players4,
    yakumans3,
    yakumans4,
    sessions3,
    sessions4,
    achievements3,
    achievements4,
    metaRef,
    fetchedRef,
    gamesMetaRef,
    fetchSummary,
    fetchGames,
    fetchAchievements,
    loadMoreGames,
    handleUpdateScores,
    initResult,
  };
}

export type HistoryData = ReturnType<typeof useHistoryData>;
