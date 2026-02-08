"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

interface PlayerData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  history: number[];
}

const COLORS = [
  "var(--arcoblue-6)",
  "var(--green-6)",
  "var(--orange-6)",
  "var(--red-6)",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
];

function buildRanking(
  allScores: { game_id: string; user_id: string; display_name: string; avatar_url: string | null; score: number }[],
  gameOrder: string[]
): PlayerData[] {
  const playerMap: Record<string, { displayName: string; avatarUrl: string | null; scores: Record<string, number> }> = {};
  for (const s of allScores) {
    if (!playerMap[s.user_id]) {
      playerMap[s.user_id] = { displayName: s.display_name, avatarUrl: s.avatar_url, scores: {} };
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

function RankingChart({ players }: { players: PlayerData[] }) {
  const allValues = players.flatMap((p) => p.history);
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 0) : 0;
  const minVal = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const range = maxVal - minVal || 1;
  const gameCount = players.length > 0 ? players[0].history.length : 0;

  const svgW = 340;
  const svgH = 180;
  const padL = 45;
  const padR = 10;
  const padY = 16;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padY * 2;

  const toX = (i: number) => padL + (gameCount > 1 ? (i / (gameCount - 1)) * chartW : chartW / 2);
  const toY = (v: number) => padY + ((maxVal - v) / range) * chartH;

  const yTicks: number[] = [];
  if (range > 0) {
    const rawStep = range / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const nice = [1, 2, 5, 10].find((n) => n * mag >= rawStep)! * mag;
    const start = Math.ceil(minVal / nice) * nice;
    for (let v = start; v <= maxVal; v += nice) {
      yTicks.push(v);
    }
    if (!yTicks.includes(0)) yTicks.push(0);
    yTicks.sort((a, b) => a - b);
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--color-bg-1)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p
        className="mb-3 text-sm font-semibold"
        style={{ color: "var(--color-text-1)" }}
      >
        スコア推移
      </p>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: "100%", height: "auto" }}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padL}
              y1={toY(v)}
              x2={svgW - padR}
              y2={toY(v)}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray={v === 0 ? "4 2" : "2 2"}
              opacity={v === 0 ? 1 : 0.5}
            />
            <text
              x={padL - 6}
              y={toY(v) + 3}
              fontSize="9"
              fill="var(--color-text-3)"
              textAnchor="end"
            >
              {v.toLocaleString()}
            </text>
          </g>
        ))}

        {players.map((p, pi) => {
          const color = COLORS[pi % COLORS.length];
          const points = p.history.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
          return (
            <g key={p.userId}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {gameCount > 0 && (
                <circle
                  cx={toX(gameCount - 1)}
                  cy={toY(p.history[gameCount - 1])}
                  r="3"
                  fill={color}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {players.map((p, pi) => (
          <div key={p.userId} className="flex items-center gap-1.5">
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: COLORS[pi % COLORS.length],
                display: "inline-block",
              }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-2)" }}>
              {p.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingList({ players }: { players: PlayerData[] }) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((p, i) => (
        <div
          key={p.userId}
          className="flex items-center gap-3 rounded-lg p-4"
          style={{
            background: "var(--color-bg-1)",
            border: `1px solid var(--color-border)`,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold"
            style={{ color: "var(--color-text-2)" }}
          >
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
          </span>
          <Avatar
            src={p.avatarUrl}
            name={p.displayName}
            size={32}
            bg={COLORS[i % COLORS.length]}
          />
          <p
            className="flex-1 text-sm font-medium"
            style={{ color: "var(--color-text-1)" }}
          >
            {p.displayName}
          </p>
          <p
            className="text-sm font-semibold"
            style={{
              color:
                p.totalScore > 0
                  ? "var(--green-6)"
                  : p.totalScore < 0
                    ? "var(--red-6)"
                    : "var(--color-text-1)",
            }}
          >
            {p.totalScore > 0 ? "+" : ""}
            {p.totalScore.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function RankingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [players3, setPlayers3] = useState<PlayerData[]>([]);
  const [players4, setPlayers4] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<3 | 4>(3);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    const fetchRanking = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
        .select("game_id, user_id, display_name, avatar_url, score, created_at")
        .in("game_id", gameIds)
        .order("created_at", { ascending: true });

      if (!allScores) {
        setLoading(false);
        return;
      }

      // 最新のプロフィール（username, avatar_url）を取得して上書き
      const userIds = [...new Set(allScores.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      if (profiles) {
        const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
        for (const p of profiles) profileMap[p.id] = p;
        for (const s of allScores) {
          const prof = profileMap[s.user_id];
          if (prof) {
            s.display_name = prof.username;
            s.avatar_url = prof.avatar_url;
          }
        }
      }

      // ゲームごとのプレイヤー数を計算
      const gamePlayerCount: Record<string, number> = {};
      for (const s of allScores) {
        gamePlayerCount[s.game_id] = (gamePlayerCount[s.game_id] || 0) + 1;
      }

      // 3人/4人に分割
      const scores3 = allScores.filter((s) => gamePlayerCount[s.game_id] === 3);
      const scores4 = allScores.filter((s) => gamePlayerCount[s.game_id] === 4);

      const gameOrder3: string[] = [];
      for (const s of scores3) {
        if (!gameOrder3.includes(s.game_id)) gameOrder3.push(s.game_id);
      }
      const gameOrder4: string[] = [];
      for (const s of scores4) {
        if (!gameOrder4.includes(s.game_id)) gameOrder4.push(s.game_id);
      }

      setPlayers3(buildRanking(scores3, gameOrder3));
      setPlayers4(buildRanking(scores4, gameOrder4));
      setLoading(false);
    };

    fetchRanking();
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

  if (loading) return null;

  const has3 = players3.length > 0;
  const has4 = players4.length > 0;
  const tabs: { key: 3 | 4; label: string }[] = [];
  if (has3) tabs.push({ key: 3, label: "3人麻雀" });
  if (has4) tabs.push({ key: 4, label: "4人麻雀" });
  const currentTab = tabs.find((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;
  const currentPlayers = currentTab === 3 ? players3 : players4;

  return (
    <div className="flex flex-col" style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-6">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-1)" }}
        >
          ランキング
        </h1>

        {tabs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg py-16"
            style={{
              background: "var(--color-bg-1)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-3xl">👑</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-3)" }}>
              まだ対局記録がありません
            </p>
          </div>
        ) : (
          <>
            {/* タブ */}
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
                      color: currentTab === tab.key ? "var(--arcoblue-6)" : "var(--color-text-3)",
                      borderBottom: currentTab === tab.key ? "2px solid var(--arcoblue-6)" : "2px solid transparent",
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
              <p className="text-sm font-medium" style={{ color: "var(--color-text-3)" }}>
                {tabs[0].label}
              </p>
            )}

            <RankingChart players={currentPlayers} />
            <RankingList players={currentPlayers} />
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
        <button onClick={() => router.push("/")} style={{ fontSize: "24px", lineHeight: 1 }}>🀄</button>
        <button onClick={() => router.push("/history")} style={{ fontSize: "24px", lineHeight: 1 }}>🗒️</button>
        <button style={{ fontSize: "24px", lineHeight: 1, opacity: 1 }}>👑</button>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{ lineHeight: 1, padding: 0, background: "none", border: "none", cursor: "pointer" }}
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
