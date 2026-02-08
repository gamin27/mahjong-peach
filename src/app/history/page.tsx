"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CompletedGame } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import GameScoreTable from "@/components/GameScoreTable";
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
}

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<3 | 4>(3);
  const [subTab, setSubTab] = useState<"summary" | "games">("summary");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

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
          "game_id, user_id, display_name, avatar_url, score, created_at"
        )
        .in("game_id", gameIds)
        .order("created_at", { ascending: true });

      if (!allScores) {
        setLoading(false);
        return;
      }

      // games テーブルからroom_id, round_numberを取得
      const { data: gamesData } = await supabase
        .from("games")
        .select("id, room_id, round_number, created_at")
        .in("id", gameIds)
        .order("created_at", { ascending: true });

      // ゲームごとのプレイヤー数
      const gamePlayerCount: Record<string, number> = {};
      for (const s of allScores) {
        gamePlayerCount[s.game_id] = (gamePlayerCount[s.game_id] || 0) + 1;
      }

      // ゲームごとにグループ化
      const gameMap: Record<
        string,
        {
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          score: number;
        }[]
      > = {};
      for (const s of allScores) {
        if (!gameMap[s.game_id]) gameMap[s.game_id] = [];
        gameMap[s.game_id].push(s);
      }

      // プレイヤーごとの成績集計
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

        for (const [gameId, scores] of Object.entries(gameMap)) {
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
            if (s.score < 0) st.tobiCount++;
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

      // セッション（ルーム）ごとにゲームをグループ化
      if (gamesData) {
        const buildSessions = (playerCount: number): SessionData[] => {
          const roomGames: Record<string, { date: string; games: CompletedGame[] }> = {};
          for (const g of gamesData) {
            if (gamePlayerCount[g.id] !== playerCount) continue;
            if (!roomGames[g.room_id]) {
              roomGames[g.room_id] = { date: g.created_at, games: [] };
            }
            const scores = (allScores
              .filter((s) => s.game_id === g.id)
              .map((s) => ({
                id: s.game_id + s.user_id,
                game_id: s.game_id,
                user_id: s.user_id,
                display_name: s.display_name,
                avatar_url: s.avatar_url,
                score: s.score,
              })));
            roomGames[g.room_id].games.push({
              game: { id: g.id, room_id: g.room_id, round_number: g.round_number, created_at: g.created_at },
              scores,
              yakumans: [],
            });
          }
          return Object.entries(roomGames)
            .map(([roomId, data]) => ({
              roomId,
              date: data.date,
              games: data.games.sort((a, b) => a.game.round_number - b.game.round_number),
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        };

        setSessions3(buildSessions(3));
        setSessions4(buildSessions(4));
      }

      // 役満取得
      const { data: yakumanData } = await supabase
        .from("yakuman_records")
        .select(
          "game_id, display_name, avatar_url, yakuman_type, winning_tile, created_at"
        )
        .in("game_id", gameIds);

      if (yakumanData) {
        // 役満をセッションにも追加
        const yakumanByGame: Record<string, typeof yakumanData> = {};
        for (const y of yakumanData) {
          if (!yakumanByGame[y.game_id]) yakumanByGame[y.game_id] = [];
          yakumanByGame[y.game_id].push(y);
        }

        // セッションの各ゲームに役満を追加
        const addYakumansToSessions = (sessions: SessionData[]) => {
          for (const session of sessions) {
            for (const g of session.games) {
              const yaks = yakumanByGame[g.game.id];
              if (yaks) {
                g.yakumans = yaks.map((y) => ({
                  id: y.game_id + y.display_name,
                  game_id: y.game_id,
                  user_id: "",
                  display_name: y.display_name,
                  avatar_url: y.avatar_url,
                  yakuman_type: y.yakuman_type,
                  winning_tile: y.winning_tile,
                }));
              }
            }
          }
        };

        addYakumansToSessions(sessions3);
        addYakumansToSessions(sessions4);
        // Force re-render with updated yakumans
        setSessions3((prev) => [...prev]);
        setSessions4((prev) => [...prev]);

        const y3: YakumanItem[] = [];
        const y4: YakumanItem[] = [];
        for (const y of yakumanData) {
          const item: YakumanItem = {
            displayName: y.display_name,
            avatarUrl: y.avatar_url,
            yakumanType: y.yakuman_type,
            winningTile: y.winning_tile,
            date: y.created_at,
          };
          if (gamePlayerCount[y.game_id] === 3) {
            y3.push(item);
          } else {
            y4.push(item);
          }
        }
        setYakumans3(y3);
        setYakumans4(y4);
      }

      setLoading(false);
    };

    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  // サブタブ切り替え時にページネーションリセット
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, subTab]);

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
  const lastLabel = currentTab === 3 ? "3位率" : "4位率";

  const visibleSessions = currentSessions.slice(0, visibleCount);
  const hasMore = visibleCount < currentSessions.length;

  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
    >
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-6">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-1)" }}
        >
          対戦記録
        </h1>

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
              <div
                className="rounded-lg"
                style={{
                  display: "flex",
                  background: "var(--color-bg-1)",
                  border: "1px solid var(--color-border)",
                  overflow: "hidden",
                }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex-1 py-2.5 text-sm font-medium"
                    style={{
                      color:
                        currentTab === tab.key
                          ? "var(--arcoblue-6)"
                          : "var(--color-text-3)",
                      borderBottom:
                        currentTab === tab.key
                          ? "2px solid var(--arcoblue-6)"
                          : "2px solid transparent",
                      background: "none",
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
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
            <div style={{ display: "flex", gap: "8px" }}>
              {(["summary", "games"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSubTab(t)}
                  className="rounded-full px-4 py-1.5 text-sm font-medium"
                  style={{
                    background:
                      subTab === t ? "var(--arcoblue-6)" : "var(--color-bg-1)",
                    color: subTab === t ? "#fff" : "var(--color-text-3)",
                    border: `1px solid ${subTab === t ? "var(--arcoblue-6)" : "var(--color-border)"}`,
                    cursor: "pointer",
                  }}
                >
                  {t === "summary" ? "サマリー" : "戦績"}
                </button>
              ))}
            </div>

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
                    <div className="flex flex-col gap-2">
                      {currentYakumans.map((y, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg p-3"
                          style={{
                            background: "var(--orange-1)",
                            border: "1px solid var(--orange-6)",
                          }}
                        >
                          <Avatar
                            src={y.avatarUrl}
                            name={y.displayName}
                            size={28}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-medium"
                              style={{ color: "var(--color-text-1)" }}
                            >
                              {y.displayName}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--orange-6)" }}
                            >
                              {y.yakumanType} /{" "}
                              {TILE_LABELS[y.winningTile] || y.winningTile}
                            </p>
                          </div>
                          <p
                            className="shrink-0 text-xs"
                            style={{ color: "var(--color-text-3)" }}
                          >
                            {new Date(y.date).toLocaleDateString("ja-JP", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
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
                        <GameScoreTable games={session.games} maxHeight="none" />
                      </div>
                    ))}
                    {hasMore && (
                      <button
                        onClick={() =>
                          setVisibleCount((v) => v + PAGE_SIZE)
                        }
                        className="rounded-lg px-4 py-3 text-sm font-medium"
                        style={{
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-2)",
                          background: "var(--color-bg-1)",
                          cursor: "pointer",
                        }}
                      >
                        もっと見る（残り{currentSessions.length - visibleCount}件）
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* フッターナビ */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "8px 16px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
          background: "var(--color-bg-1)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{ fontSize: "24px", lineHeight: 1 }}
        >
          🀄
        </button>
        <button style={{ fontSize: "24px", lineHeight: 1, opacity: 1 }}>
          🗒️
        </button>
        <button
          onClick={() => router.push("/ranking")}
          style={{ fontSize: "24px", lineHeight: 1 }}
        >
          👑
        </button>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{
              lineHeight: 1,
              padding: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Avatar src={avatarUrl} name={username || "?"} size={28} />
          </button>
          {showMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                right: 0,
                background: "var(--color-bg-1)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                boxShadow: "var(--shadow-popup)",
                minWidth: "160px",
                overflow: "hidden",
                zIndex: 100,
              }}
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  router.push("/account/edit");
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: "var(--color-text-1)",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                アカウント編集
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleLogout();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: "var(--red-6)",
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </nav>
      <div style={{ height: "70px" }} />
    </div>
  );
}
