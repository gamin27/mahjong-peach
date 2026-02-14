"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CompletedGame } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import Main from "@/components/Main";
import GameScoreTable from "@/components/GameScoreTable";
import Button from "@/components/Button";
import Tabs from "@/components/Tabs";
import FooterNav from "@/components/FooterNav";
import Loading from "@/components/Loading";
import { TILE_LABELS } from "@/components/YakumanModal";
import AchievementBadges from "@/components/AchievementBadges";
import { computeAchievements } from "@/lib/achievements";
import type { AchievementData } from "@/lib/achievements";

interface PlayerStats {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalGames: number;
  topRate: number;
  lastRate: number;
  avgRank: number;
  tobiRate: number;
}

interface YakumanItem {
  displayName: string;
  avatarUrl: string | null;
  yakumanType: string;
  winningTile: string;
  date: string;
}

interface SessionData {
  roomId: string;
  date: string;
  games: CompletedGame[];
  ptRate: number;
}

const PAGE_SIZE = 5;

interface GameMeta {
  id: string;
  room_id: string;
  round_number: number;
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [players3, setPlayers3] = useState<PlayerStats[]>([]);
  const [players4, setPlayers4] = useState<PlayerStats[]>([]);
  const [yakumans3, setYakumans3] = useState<YakumanItem[]>([]);
  const [yakumans4, setYakumans4] = useState<YakumanItem[]>([]);
  const [sessions3, setSessions3] = useState<SessionData[]>([]);
  const [sessions4, setSessions4] = useState<SessionData[]>([]);
  const [achievements3, setAchievements3] = useState<AchievementData[]>([]);
  const [achievements4, setAchievements4] = useState<AchievementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<3 | 4>(3);
  const [subTab, setSubTab] = useState<"summary" | "games" | "achievements">(
    "summary",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // 初回ロードで取得する軽量メタデータ
  const metaRef = useRef<{
    gamesData: GameMeta[];
    gamePlayerCount: Record<string, number>;
  } | null>(null);

  // fetch済みキャッシュ ("summary:2025:3" 等)
  const fetchedRef = useRef(new Set<string>());

  // 戦績タブのページネーション情報 (key: "year:playerCount")
  const gamesMetaRef = useRef<
    Record<
      string,
      { rooms: string[]; loaded: number; roomGameIds: Record<string, string[]> }
    >
  >({});

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

    setTabLoading(true);

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
      setTabLoading(false);
      return;
    }

    // Step 1: yearGameIdsからプレイヤーIDを取得 + 役満取得
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
      setTabLoading(false);
      return;
    }

    // Step 2: プレイヤーが参加した全ゲームIDを取得
    const { data: playerGameRows } = await supabase
      .from("game_scores")
      .select("game_id")
      .in("user_id", playerIds);

    const allGameIdsFromPlayers = [
      ...new Set(playerGameRows?.map((r) => r.game_id) || []),
    ];

    // Step 3: 追加ゲームのメタデータ + プレイヤー数を取得
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

    // ゲーム年マップ
    const gameYearMap: Record<string, number> = {};
    for (const g of meta.gamesData)
      gameYearMap[g.id] = new Date(g.created_at).getFullYear();
    for (const g of additionalGamesRes.data || [])
      gameYearMap[g.id] = new Date(g.created_at).getFullYear();

    // プレイヤー数マップ
    const gpc: Record<string, number> = {};
    for (const row of countRes.data || []) {
      gpc[row.game_id] = (gpc[row.game_id] || 0) + 1;
    }

    // year + playerCount でフィルタ
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
      setTabLoading(false);
      return;
    }

    // Step 4: filteredGamesの全スコア + 飛びデータを取得
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

    // co-playerのみ表示
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
    setTabLoading(false);
  };

  // 戦績: 次の PAGE_SIZE 件のルームをfetch
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

  // 戦績: 年+人数の初回ロード（ルーム一覧計算 → 最初の5件fetch）
  const fetchGames = async (year: number, playerCount: 3 | 4) => {
    const meta = metaRef.current;
    if (!meta) return;

    setTabLoading(true);

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
    setTabLoading(false);
  };

  const fetchAchievements = async (year: number, playerCount: 3 | 4) => {
    const meta = metaRef.current;
    if (!meta) return;

    setTabLoading(true);

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
      setTabLoading(false);
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
    setTabLoading(false);
  };

  // ---- イベントハンドラ ----

  const getEffectiveTab = (desired: 3 | 4, year: number): 3 | 4 => {
    const meta = metaRef.current;
    if (!meta) return desired;
    const hasDesired = meta.gamesData.some(
      (g) =>
        new Date(g.created_at).getFullYear() === year &&
        meta.gamePlayerCount[g.id] === desired,
    );
    if (hasDesired) return desired;
    // desired側がなければ反対側
    const other: 3 | 4 = desired === 3 ? 4 : 3;
    const hasOther = meta.gamesData.some(
      (g) =>
        new Date(g.created_at).getFullYear() === year &&
        meta.gamePlayerCount[g.id] === other,
    );
    return hasOther ? other : desired;
  };

  const fetchForTab = async (year: number, tab: typeof subTab, pc: 3 | 4) => {
    const key = `${tab}:${year}:${pc}`;
    if (fetchedRef.current.has(key)) return;
    if (tab === "summary") {
      await fetchSummary(year, pc);
    } else if (tab === "games") {
      await fetchGames(year, pc);
    } else if (tab === "achievements") {
      await fetchAchievements(year, pc);
    }
  };

  const handleYearChange = async (year: number) => {
    if (year === selectedYear) return;
    setSelectedYear(year);
    const pc = getEffectiveTab(activeTab, year);
    setActiveTab(pc);
    await fetchForTab(year, subTab, pc);
  };

  const handleSubTabChange = async (newSubTab: typeof subTab) => {
    setSubTab(newSubTab);
    await fetchForTab(selectedYear, newSubTab, activeTab);
  };

  const handleActiveTabChange = async (pc: 3 | 4) => {
    setActiveTab(pc);
    await fetchForTab(selectedYear, subTab, pc);
  };

  const handleLoadMore = async (playerCount: 3 | 4) => {
    setTabLoading(true);
    await loadMoreGames(selectedYear, playerCount);
    setTabLoading(false);
  };

  // ---- スコア編集（admin用） ----

  const handleUpdateScores = async (
    roomId: string,
    gameIndex: number,
    scores: { userId: string; score: number }[],
  ) => {
    const setSessions = activeTab === 3 ? setSessions3 : setSessions4;
    const sessions = activeTab === 3 ? sessions3 : sessions4;
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

  // ---- 初回ロード: メタデータのみ ----

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
        setAvatarUrl(profile.avatar_url);
        setUsername(profile.username);
        if (profile.is_admin) setIsAdmin(true);
      }

      // 自分が所属するルームを取得
      const { data: myRooms } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", session.user.id);
      if (!myRooms || myRooms.length === 0) {
        setLoading(false);
        return;
      }
      const roomIds = [...new Set(myRooms.map((r) => r.room_id))];

      // ルーム内の全ゲームを取得
      const gamesRes = await supabase
        .from("games")
        .select("id, room_id, round_number, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: true });

      const allGameIds = gamesRes.data?.map((g) => g.id) ?? [];
      if (allGameIds.length === 0) {
        setLoading(false);
        return;
      }

      // プレイヤー人数を取得
      const countsRes = await supabase
        .from("game_scores")
        .select("game_id")
        .in("game_id", allGameIds);

      const gamesData = gamesRes.data;
      if (!gamesData) {
        setLoading(false);
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
      setAvailableYears(years);
      const initialYear = years[0] || new Date().getFullYear();
      setSelectedYear(initialYear);
      setLoading(false);

      // デフォルトタブ（サマリー）のデータをfetch
      const initialTab = getEffectiveTab(3, initialYear);
      setActiveTab(initialTab);
      await fetchSummary(initialYear, initialTab);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div
        className="flex flex-col"
        style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
      >
        <Main>
          <Loading />
        </Main>
        <FooterNav active="history" avatarUrl={avatarUrl} username={username} />
      </div>
    );
  }

  const has3 = metaRef.current
    ? metaRef.current.gamesData.some(
        (g) =>
          new Date(g.created_at).getFullYear() === selectedYear &&
          metaRef.current!.gamePlayerCount[g.id] === 3,
      )
    : false;
  const has4 = metaRef.current
    ? metaRef.current.gamesData.some(
        (g) =>
          new Date(g.created_at).getFullYear() === selectedYear &&
          metaRef.current!.gamePlayerCount[g.id] === 4,
      )
    : false;
  const tabs: { key: 3 | 4; label: string }[] = [];
  if (has3) tabs.push({ key: 3, label: "3人麻雀" });
  if (has4) tabs.push({ key: 4, label: "4人麻雀" });
  const currentTab = tabs.find((t) => t.key === activeTab)
    ? activeTab
    : tabs[0]?.key;
  const currentPlayers = currentTab === 3 ? players3 : players4;
  const currentYakumans = currentTab === 3 ? yakumans3 : yakumans4;
  const currentSessions = currentTab === 3 ? sessions3 : sessions4;
  const currentAchievements = currentTab === 3 ? achievements3 : achievements4;
  const lastLabel = currentTab === 3 ? "3位率" : "4位率";

  // 戦績「もっと見る」の残り件数
  const gamesRemaining = (() => {
    const key = `${selectedYear}:${currentTab}`;
    const gm = gamesMetaRef.current[key];
    if (!gm) return 0;
    return Math.max(0, gm.rooms.length - gm.loaded);
  })();

  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
    >
      <Main>
        <div className="flex items-center justify-between">
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-1)" }}
          >
            対戦記録
          </h1>
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              style={{
                padding: "4px 24px 4px 8px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-1)",
                color: "var(--color-text-1)",
                cursor: "pointer",
              }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          )}
        </div>

        {tabs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg py-16"
            style={{
              background: "var(--color-bg-1)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-3xl">🗒️</p>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-text-3)" }}
            >
              まだ対局記録がありません
            </p>
          </div>
        ) : (
          <>
            {/* 3人/4人タブ */}
            {tabs.length > 1 && (
              <Tabs
                tabs={tabs}
                activeKey={currentTab}
                onChange={handleActiveTabChange}
                contained
              />
            )}

            {tabs.length === 1 && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-3)" }}
              >
                {tabs[0].label}
              </p>
            )}

            {/* サマリー/戦績/実績 サブタブ */}
            <Tabs
              tabs={[
                { key: "summary" as const, label: "サマリー" },
                { key: "games" as const, label: "戦績" },
                { key: "achievements" as const, label: "実績" },
              ]}
              activeKey={subTab}
              onChange={handleSubTabChange}
              variant="pill"
            />

            {/* サマリータブ */}
            {subTab === "summary" && (
              <>
                {tabLoading && currentPlayers.length === 0 ? (
                  <Loading />
                ) : (
                  <>
                    {/* プレイヤー一覧 */}
                    <div className="flex flex-col gap-3">
                      {currentPlayers.map((p) => (
                        <div
                          key={p.userId}
                          className="rounded-lg p-4"
                          style={{
                            background: "var(--color-bg-1)",
                            border: "1px solid var(--color-border)",
                            boxShadow: "var(--shadow-card)",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={p.avatarUrl}
                              name={p.displayName}
                              size={36}
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-sm font-medium"
                                style={{ color: "var(--color-text-1)" }}
                              >
                                {p.displayName}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "var(--color-text-3)" }}
                              >
                                {p.totalGames}戦
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            <div>
                              <p
                                className="text-xs"
                                style={{ color: "var(--color-text-3)" }}
                              >
                                1位率
                              </p>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: "var(--arcoblue-6)" }}
                              >
                                {p.topRate.toFixed(0)}%
                              </p>
                            </div>
                            <div>
                              <p
                                className="text-xs"
                                style={{ color: "var(--color-text-3)" }}
                              >
                                {lastLabel}
                              </p>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: "var(--red-6)" }}
                              >
                                {p.lastRate.toFixed(0)}%
                              </p>
                            </div>
                            <div>
                              <p
                                className="text-xs"
                                style={{ color: "var(--color-text-3)" }}
                              >
                                平均順位
                              </p>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: "var(--color-text-1)" }}
                              >
                                {p.avgRank.toFixed(1)}位
                              </p>
                            </div>
                            <div>
                              <p
                                className="text-xs"
                                style={{ color: "var(--color-text-3)" }}
                              >
                                飛び率
                              </p>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: "var(--orange-6)" }}
                              >
                                {p.tobiRate.toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 役満上がり一覧 */}
                    {currentYakumans.length > 0 && (
                      <div>
                        <p
                          className="mb-3 text-sm font-semibold"
                          style={{ color: "var(--color-text-1)" }}
                        >
                          役満一覧
                        </p>
                        <div
                          className="rounded-lg"
                          style={{
                            background: "var(--color-bg-1)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {currentYakumans.map((y, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-4 py-3"
                              style={{
                                borderBottom:
                                  i < currentYakumans.length - 1
                                    ? "1px solid var(--color-border)"
                                    : "none",
                              }}
                            >
                              <Avatar
                                src={y.avatarUrl}
                                name={y.displayName}
                                size={32}
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: "var(--color-text-1)" }}
                                >
                                  {y.displayName} — {y.yakumanType}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: "var(--color-text-3)" }}
                                >
                                  {y.winningTile
                                    ? `${TILE_LABELS[y.winningTile] || y.winningTile} ・ `
                                    : ""}
                                  {new Date(y.date).toLocaleDateString(
                                    "ja-JP",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* 戦績タブ */}
            {subTab === "games" && (
              <>
                {tabLoading && currentSessions.length === 0 ? (
                  <Loading />
                ) : currentSessions.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg py-12"
                    style={{
                      background: "var(--color-bg-1)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-3)" }}
                    >
                      まだ戦績がありません
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {currentSessions.map((session) => (
                      <div key={session.roomId}>
                        <p
                          className="mb-2 text-xs font-medium"
                          style={{ color: "var(--color-text-3)" }}
                        >
                          {new Date(session.date).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          ・{session.games.length}半荘
                        </p>
                        <GameScoreTable
                          games={session.games}
                          maxHeight="none"
                          ptRate={session.ptRate}
                          showLabel={false}
                          onUpdateScores={
                            isAdmin
                              ? (gameIndex, scores) =>
                                  handleUpdateScores(
                                    session.roomId,
                                    gameIndex,
                                    scores,
                                  )
                              : undefined
                          }
                        />
                      </div>
                    ))}
                    {gamesRemaining > 0 && (
                      <Button
                        variant="tertiary"
                        onClick={() => handleLoadMore(currentTab as 3 | 4)}
                        disabled={tabLoading}
                      >
                        {tabLoading
                          ? "読み込み中..."
                          : `もっと見る（残り${gamesRemaining}件）`}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 実績タブ */}
            {subTab === "achievements" && (
              <>
                {tabLoading && currentAchievements.length === 0 ? (
                  <Loading />
                ) : currentAchievements.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg py-12"
                    style={{
                      background: "var(--color-bg-1)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-3)" }}
                    >
                      まだ実績はありません
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {currentAchievements.map((a) => (
                      <div
                        key={a.userId}
                        className="rounded-lg p-4"
                        style={{
                          background: "var(--color-bg-1)",
                          border: "1px solid var(--color-border)",
                          boxShadow: "var(--shadow-card)",
                        }}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <Avatar
                            src={a.avatarUrl}
                            name={a.displayName}
                            size={36}
                          />
                          <p
                            className="truncate text-sm font-medium"
                            style={{ color: "var(--color-text-1)" }}
                          >
                            {a.displayName}
                          </p>
                        </div>
                        <AchievementBadges data={a} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Main>

      <FooterNav active="history" avatarUrl={avatarUrl} username={username} />
    </div>
  );
}
