"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CompletedGame } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import Main from "@/components/Main";
import GameScoreTable from "@/components/GameScoreTable";
import Button from "@/components/Button";
import Tabs from "@/components/Tabs";
import FooterNav from "@/components/FooterNav";
import Tooltip from "@/components/Tooltip";
import { TILE_LABELS } from "@/components/YakumanModal";

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

interface AchievementData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  tobashiCount: number;
  flowCount: number;
  fugouCount: number;
  yakumanCount: number;
}

const ACHIEVEMENTS = [
  { key: "tobashi", icon: "💥", label: "飛ばし", desc: "相手を飛ばした回数" },
  { key: "flow", icon: "🔥", label: "雀士フロー", desc: "3連続1位を達成した回数" },
  { key: "fugou", icon: "💰", label: "富豪", desc: "スコア100以上を記録した回数" },
  { key: "yakuman", icon: "🀄", label: "役満", desc: "役満を上がった回数" },
] as const;

const PAGE_SIZE = 30;

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
  const [activeTab, setActiveTab] = useState<3 | 4>(3);
  const [subTab, setSubTab] = useState<"summary" | "games" | "achievements">(
    "summary",
  );
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRef = useRef<any>(null);
  // 年ごとにデータを再集計
  const computeForYear = useCallback((year: number) => {
    const raw = rawRef.current;
    if (!raw) return;
    const {
      gamesData,
      allScores,
      gamePlayerCount,
      gameMap,
      tobiData,
      tobashiData,
      yakumanData,
      roomPtRates,
    } = raw;

    const yearGameIds = new Set(
      gamesData
        .filter(
          (g: { created_at: string }) =>
            new Date(g.created_at).getFullYear() === year,
        )
        .map((g: { id: string }) => g.id),
    );

    // 飛びセット
    const tobiSet = new Set<string>();
    for (const t of tobiData) {
      if (yearGameIds.has(t.game_id))
        tobiSet.add(`${t.game_id}:${t.user_id}`);
    }

    // プレイヤー成績
    const buildStats = (playerCount: number): PlayerStats[] => {
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
      for (const [gameId, scores] of Object.entries(
        gameMap as Record<
          string,
          {
            user_id: string;
            display_name: string;
            avatar_url: string | null;
            score: number;
          }[]
        >,
      )) {
        if (!yearGameIds.has(gameId)) continue;
        if (gamePlayerCount[gameId] !== playerCount) continue;
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
      return Object.entries(stats)
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
        .sort((a, b) => a.avgRank - b.avgRank);
    };
    setPlayers3(buildStats(3));
    setPlayers4(buildStats(4));

    // セッション
    const buildSessions = (playerCount: number): SessionData[] => {
      const roomGames: Record<
        string,
        { date: string; games: CompletedGame[]; ptRate: number }
      > = {};
      for (const g of gamesData) {
        if (!yearGameIds.has(g.id)) continue;
        if (gamePlayerCount[g.id] !== playerCount) continue;
        if (!roomGames[g.room_id]) {
          roomGames[g.room_id] = {
            date: g.created_at,
            games: [],
            ptRate: roomPtRates[g.room_id] ?? 50,
          };
        }
        const scores = allScores
          .filter(
            (s: { game_id: string }) => s.game_id === g.id,
          )
          .map(
            (s: {
              game_id: string;
              user_id: string;
              display_name: string;
              avatar_url: string | null;
              score: number;
            }) => ({
              id: s.game_id + s.user_id,
              game_id: s.game_id,
              user_id: s.user_id,
              display_name: s.display_name,
              avatar_url: s.avatar_url,
              score: s.score,
            }),
          );
        const gameYakumans = yakumanData
          .filter(
            (y: { game_id: string }) => y.game_id === g.id,
          )
          .map(
            (y: {
              game_id: string;
              user_id: string;
              display_name: string;
              avatar_url: string | null;
              yakuman_type: string;
              winning_tile: string;
            }) => ({
              id: y.game_id + y.display_name,
              game_id: y.game_id,
              user_id: y.user_id,
              display_name: y.display_name,
              avatar_url: y.avatar_url,
              yakuman_type: y.yakuman_type,
              winning_tile: y.winning_tile,
            }),
          );
        roomGames[g.room_id].games.push({
          game: {
            id: g.id,
            room_id: g.room_id,
            round_number: g.round_number,
            created_at: g.created_at,
          },
          scores,
          yakumans: gameYakumans,
        });
      }
      return Object.entries(roomGames)
        .map(([roomId, data]) => ({
          roomId,
          date: data.date,
          games: data.games.sort(
            (a, b) => a.game.round_number - b.game.round_number,
          ),
          ptRate: data.ptRate,
        }))
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    };
    setSessions3(buildSessions(3));
    setSessions4(buildSessions(4));

    // 役満一覧
    const y3: YakumanItem[] = [];
    const y4: YakumanItem[] = [];
    for (const y of yakumanData) {
      if (!yearGameIds.has(y.game_id)) continue;
      const item: YakumanItem = {
        displayName: y.display_name,
        avatarUrl: y.avatar_url,
        yakumanType: y.yakuman_type,
        winningTile: y.winning_tile,
        date: y.created_at,
      };
      if (gamePlayerCount[y.game_id] === 3) y3.push(item);
      else y4.push(item);
    }
    setYakumans3(y3);
    setYakumans4(y4);

    // 実績
    const buildAchievements = (playerCount: number): AchievementData[] => {
      const yearGames = gamesData
        .filter(
          (g: { id: string; created_at: string }) =>
            yearGameIds.has(g.id) &&
            gamePlayerCount[g.id] === playerCount,
        )
        .sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        );
      const pd: Record<
        string,
        {
          displayName: string;
          avatarUrl: string | null;
          tobashiCount: number;
          ranks: number[];
          fugouCount: number;
          yakumanCount: number;
        }
      > = {};
      for (const g of yearGames) {
        const scores = gameMap[g.id];
        if (!scores) continue;
        const sorted = [...scores].sort(
          (
            a: { score: number },
            b: { score: number },
          ) => b.score - a.score,
        );
        sorted.forEach(
          (
            s: {
              user_id: string;
              display_name: string;
              avatar_url: string | null;
              score: number;
            },
            idx: number,
          ) => {
            if (!pd[s.user_id]) {
              pd[s.user_id] = {
                displayName: s.display_name,
                avatarUrl: s.avatar_url,
                tobashiCount: 0,
                ranks: [],
                fugouCount: 0,
                yakumanCount: 0,
              };
            }
            pd[s.user_id].ranks.push(idx + 1);
            if (s.score >= 100) pd[s.user_id].fugouCount++;
          },
        );
      }
      for (const t of tobashiData) {
        if (yearGameIds.has(t.game_id) && pd[t.user_id])
          pd[t.user_id].tobashiCount++;
      }
      for (const y of yakumanData) {
        if (yearGameIds.has(y.game_id) && pd[y.user_id])
          pd[y.user_id].yakumanCount++;
      }
      return Object.entries(pd)
        .map(([uid, d]) => {
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
          return {
            userId: uid,
            displayName: d.displayName,
            avatarUrl: d.avatarUrl,
            tobashiCount: d.tobashiCount,
            flowCount,
            fugouCount: d.fugouCount,
            yakumanCount: d.yakumanCount,
          };
        })
        .filter(
          (a) =>
            a.tobashiCount > 0 ||
            a.flowCount > 0 ||
            a.fugouCount > 0 ||
            a.yakumanCount > 0,
        )
        .sort((a, b) => {
          const totalA =
            a.tobashiCount + a.flowCount + a.fugouCount + a.yakumanCount;
          const totalB =
            b.tobashiCount + b.flowCount + b.fugouCount + b.yakumanCount;
          return totalB - totalA;
        });
    };
    setAchievements3(buildAchievements(3));
    setAchievements4(buildAchievements(4));
  }, []);

  // データ取得
  useEffect(() => {
    const fetchHistory = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .single();
      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setUsername(profile.username);
      }

      const { data: myScores } = await supabase
        .from("game_scores")
        .select("game_id")
        .eq("user_id", userId);
      if (!myScores || myScores.length === 0) {
        setLoading(false);
        return;
      }

      const gameIds = [...new Set(myScores.map((s) => s.game_id))];

      const { data: allScores } = await supabase
        .from("game_scores")
        .select(
          "game_id, user_id, display_name, avatar_url, score, created_at",
        )
        .in("game_id", gameIds)
        .order("created_at", { ascending: true });
      if (!allScores) {
        setLoading(false);
        return;
      }

      // 最新プロフィールで上書き
      const userIds = [...new Set(allScores.map((s) => s.user_id))];
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
        for (const s of allScores) {
          const prof = profileMap[s.user_id];
          if (prof) {
            s.display_name = prof.username;
            s.avatar_url = prof.avatar_url;
          }
        }
      }

      const { data: gamesData } = await supabase
        .from("games")
        .select("id, room_id, round_number, created_at")
        .in("id", gameIds)
        .order("created_at", { ascending: true });

      const gamePlayerCount: Record<string, number> = {};
      const gameMap: Record<string, typeof allScores> = {};
      for (const s of allScores) {
        gamePlayerCount[s.game_id] =
          (gamePlayerCount[s.game_id] || 0) + 1;
        if (!gameMap[s.game_id]) gameMap[s.game_id] = [];
        gameMap[s.game_id].push(s);
      }

      const { data: tobiData } = await supabase
        .from("tobashi_records")
        .select("game_id, user_id")
        .in("game_id", gameIds)
        .eq("type", "tobi");
      const { data: tobashiData } = await supabase
        .from("tobashi_records")
        .select("game_id, user_id")
        .in("game_id", gameIds)
        .eq("type", "tobashi");

      const roomIds = gamesData
        ? [...new Set(gamesData.map((g) => g.room_id))]
        : [];
      const roomPtRates: Record<string, number> = {};
      if (roomIds.length > 0) {
        const { data: roomsData } = await supabase
          .from("rooms")
          .select("id, pt_rate")
          .in("id", roomIds);
        if (roomsData)
          for (const r of roomsData) roomPtRates[r.id] = r.pt_rate;
      }

      const { data: yakumanData } = await supabase
        .from("yakuman_records")
        .select(
          "game_id, user_id, display_name, avatar_url, yakuman_type, winning_tile, created_at",
        )
        .in("game_id", gameIds);

      rawRef.current = {
        gamesData: gamesData || [],
        allScores,
        gamePlayerCount,
        gameMap,
        tobiData: tobiData || [],
        tobashiData: tobashiData || [],
        yakumanData: yakumanData || [],
        roomPtRates,
      };

      const years = [
        ...new Set(
          (gamesData || []).map((g) =>
            new Date(g.created_at).getFullYear(),
          ),
        ),
      ].sort((a, b) => b - a);
      setAvailableYears(years);
      const initialYear = years[0] || new Date().getFullYear();
      setSelectedYear(initialYear);
      computeForYear(initialYear);
      setLoading(false);
    };

    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 年変更時に再集計
  useEffect(() => {
    if (!loading && rawRef.current) computeForYear(selectedYear);
  }, [selectedYear, loading, computeForYear]);

  // ツールチップ外クリックで閉じる
  useEffect(() => {
    if (!activeTooltip) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-achievement-badge]")) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeTooltip]);

  // サブタブ切り替え時にページネーションリセット
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, subTab, selectedYear]);

  if (loading) return null;

  const has3 = players3.length > 0 || sessions3.length > 0;
  const has4 = players4.length > 0 || sessions4.length > 0;
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

  const visibleSessions = currentSessions.slice(0, visibleCount);
  const hasMore = visibleCount < currentSessions.length;

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
              onChange={(e) => setSelectedYear(Number(e.target.value))}
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
              <Tabs tabs={tabs} activeKey={currentTab} onChange={setActiveTab} contained />
            )}

            {tabs.length === 1 && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-3)" }}
              >
                {tabs[0].label}
              </p>
            )}

            {/* サマリー/戦績 サブタブ */}
            <Tabs
              tabs={[
                { key: "summary" as const, label: "サマリー" },
                { key: "games" as const, label: "戦績" },
                { key: "achievements" as const, label: "実績" },
              ]}
              activeKey={subTab}
              onChange={setSubTab}
              variant="pill"
            />

            {/* サマリータブ */}
            {subTab === "summary" && (
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
                          <Avatar src={y.avatarUrl} name={y.displayName} size={32} />
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
                              {y.winningTile ? `${TILE_LABELS[y.winningTile] || y.winningTile} ・ ` : ""}
                              {new Date(y.date).toLocaleDateString("ja-JP", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 戦績タブ */}
            {subTab === "games" && (
              <>
                {currentSessions.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg py-12"
                    style={{
                      background: "var(--color-bg-1)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
                      まだ戦績がありません
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {visibleSessions.map((session) => (
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
                        <GameScoreTable games={session.games} maxHeight="none" ptRate={session.ptRate} />
                      </div>
                    ))}
                    {hasMore && (
                      <Button
                        variant="tertiary"
                        onClick={() =>
                          setVisibleCount((v) => v + PAGE_SIZE)
                        }
                      >
                        もっと見る（残り{currentSessions.length - visibleCount}件）
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 実績タブ */}
            {subTab === "achievements" && (
              <>
                {currentAchievements.length === 0 ? (
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
                        <div className="flex flex-wrap gap-2">
                          {ACHIEVEMENTS.map((ach) => {
                            const count =
                              ach.key === "tobashi"
                                ? a.tobashiCount
                                : ach.key === "flow"
                                  ? a.flowCount
                                  : ach.key === "fugou"
                                    ? a.fugouCount
                                    : a.yakumanCount;
                            if (count === 0) return null;
                            const tooltipId = `${a.userId}:${ach.key}`;
                            const isOpen = activeTooltip === tooltipId;
                            return (
                              <Tooltip
                                key={ach.key}
                                open={isOpen}
                                content={
                                  <>
                                    <p
                                      className="text-xs font-medium"
                                      style={{
                                        color: "var(--color-text-1)",
                                      }}
                                    >
                                      {ach.label}
                                    </p>
                                    <p
                                      className="text-xs"
                                      style={{
                                        color: "var(--color-text-3)",
                                      }}
                                    >
                                      {ach.desc}
                                    </p>
                                  </>
                                }
                              >
                                <button
                                  onClick={() =>
                                    setActiveTooltip(
                                      isOpen ? null : tooltipId,
                                    )
                                  }
                                  data-achievement-badge
                                  className="flex items-center gap-1 rounded-full px-3 py-1.5"
                                  style={{
                                    background: "var(--color-fill-2)",
                                    color: "var(--color-text-1)",
                                    border: `1px solid ${isOpen ? "var(--arcoblue-6)" : "var(--color-border)"}`,
                                    cursor: "pointer",
                                    fontSize: "13px",
                                  }}
                                >
                                  <span>{ach.icon}</span>
                                  <span
                                    className="font-semibold"
                                    style={{
                                      color: "var(--color-text-1)",
                                    }}
                                  >
                                    ×{count}
                                  </span>
                                </button>
                              </Tooltip>
                            );
                          })}
                        </div>
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
