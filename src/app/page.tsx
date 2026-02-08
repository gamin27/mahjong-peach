"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

interface ModeStats {
  totalGames: number;
  totalScore: number;
  avgRank: number | null;
  rankDist: number[]; // index 0=1位率, 1=2位率, ...
}

interface RankPoint {
  rank: number;
  hasYakuman: boolean;
}

const emptyModeStats: ModeStats = { totalGames: 0, totalScore: 0, avgRank: null, rankDist: [] };

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [stats3, setStats3] = useState<ModeStats>(emptyModeStats);
  const [stats4, setStats4] = useState<ModeStats>(emptyModeStats);
  const [rankHistory3, setRankHistory3] = useState<RankPoint[]>([]);
  const [rankHistory4, setRankHistory4] = useState<RankPoint[]>([]);
  const [activeTab, setActiveTab] = useState<3 | 4>(3);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // プロフィール取得
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .single();
      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setUsername(profile.username);
      }

      // このユーザーが参加した全game_idを取得
      const { data: myScores } = await supabase
        .from("game_scores")
        .select("game_id, score")
        .eq("user_id", userId);

      if (!myScores || myScores.length === 0) return;

      const gameIds = myScores.map((s) => s.game_id);
      const totalGames = gameIds.length;
      const totalScore = myScores.reduce((acc, s) => acc + s.score, 0);

      // 参加した全ゲームの全スコアを取得して順位計算
      const { data: allScores } = await supabase
        .from("game_scores")
        .select("game_id, user_id, score, created_at")
        .in("game_id", gameIds);

      if (!allScores) return;

      // ゲームごとにグループ化
      const gameMap: Record<string, { user_id: string; score: number }[]> = {};
      const gameTimes: Record<string, string> = {};
      for (const s of allScores) {
        if (!gameMap[s.game_id]) gameMap[s.game_id] = [];
        gameMap[s.game_id].push(s);
        if (!gameTimes[s.game_id] || s.created_at < gameTimes[s.game_id]) {
          gameTimes[s.game_id] = s.created_at;
        }
      }

      // 役満記録を取得
      const { data: yakumanData } = await supabase
        .from("yakuman_records")
        .select("game_id")
        .in("game_id", gameIds);

      const yakumanGameIds = new Set(yakumanData?.map((y) => y.game_id) ?? []);

      // 時系列順にソート
      const sortedGameIds = [...new Set(gameIds)].sort(
        (a, b) => (gameTimes[a] || "").localeCompare(gameTimes[b] || "")
      );

      const ranks3: RankPoint[] = [];
      const ranks4: RankPoint[] = [];
      let rankSum3 = 0, rankSum4 = 0;
      let score3 = 0, score4 = 0;
      const rankCount3 = [0, 0, 0]; // 1位,2位,3位
      const rankCount4 = [0, 0, 0, 0]; // 1位,2位,3位,4位

      for (const gameId of sortedGameIds) {
        const scores = gameMap[gameId];
        if (!scores) continue;
        const sorted = [...scores].sort((a, b) => b.score - a.score);
        const rank = sorted.findIndex((s) => s.user_id === userId) + 1;
        const myScore = scores.find((s) => s.user_id === userId)?.score ?? 0;
        const point: RankPoint = { rank, hasYakuman: yakumanGameIds.has(gameId) };
        if (scores.length === 3) {
          ranks3.push(point);
          rankSum3 += rank;
          score3 += myScore;
          rankCount3[rank - 1]++;
        } else {
          ranks4.push(point);
          rankSum4 += rank;
          score4 += myScore;
          rankCount4[rank - 1]++;
        }
      }

      setRankHistory3(ranks3.slice(-30));
      setRankHistory4(ranks4.slice(-30));

      const total3 = ranks3.length;
      const total4 = ranks4.length;
      setStats3(total3 > 0 ? {
        totalGames: total3,
        totalScore: score3,
        avgRank: rankSum3 / total3,
        rankDist: rankCount3.map((c) => (c / total3) * 100),
      } : emptyModeStats);
      setStats4(total4 > 0 ? {
        totalGames: total4,
        totalScore: score4,
        avgRank: rankSum4 / total4,
        rankDist: rankCount4.map((c) => (c / total4) * 100),
      } : emptyModeStats);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外側クリックでメニューを閉じる
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const formatScore = (v: number) => (v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString());

  return (
    <div className="flex flex-col" style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}>
      {/* メインコンテンツ */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
        {/* ウェルカムカード */}
        <div
          className="rounded-lg p-6"
          style={{
            background: "linear-gradient(135deg, var(--arcoblue-6), var(--arcoblue-5))",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h1 className="text-xl font-semibold text-white">麻雀成績管理</h1>
          <p className="mt-1 text-sm text-blue-100">
            対局結果を記録して、成績を振り返ろう
          </p>
        </div>

        {/* アクションカード */}
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => router.push("/rooms/create")}
            className="flex items-center gap-4 rounded-lg p-5 text-left transition-shadow hover:shadow-md"
            style={{
              background: "var(--color-bg-1)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{ background: "var(--arcoblue-1)", color: "var(--arcoblue-6)" }}
            >
              +
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>
                ルームを作成
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-3)" }}>
                新しいルームを作成して対局を始める
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push("/rooms/join")}
            className="flex items-center gap-4 rounded-lg p-5 text-left transition-shadow hover:shadow-md"
            style={{
              background: "var(--color-bg-1)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{ background: "var(--green-1)", color: "var(--green-6)" }}
            >
              🚪
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>
                ルームに参加
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-3)" }}>
                ルーム番号を入力して参加する
              </p>
            </div>
          </button>
        </div>

        {/* 成績（タブ切り替え） */}
        {(stats3.totalGames > 0 || stats4.totalGames > 0) && (() => {
          const tabs: { key: 3 | 4; label: string }[] = [];
          if (stats3.totalGames > 0) tabs.push({ key: 3, label: "3人麻雀" });
          if (stats4.totalGames > 0) tabs.push({ key: 4, label: "4人麻雀" });
          const currentTab = tabs.find((t) => t.key === activeTab) ? activeTab : tabs[0].key;
          const st = currentTab === 3 ? stats3 : stats4;
          const data = currentTab === 3 ? rankHistory3 : rankHistory4;
          const maxRank = currentTab;
          const RANK_COLORS = ["var(--arcoblue-6)", "var(--green-6)", "var(--orange-6)", "var(--red-6)"];

          const count = data.length;
          const svgW = 340;
          const svgH = maxRank === 3 ? 110 : 130;
          const padL = 30;
          const padR = 12;
          const padT = 12;
          const padB = 20;
          const chartW = svgW - padL - padR;
          const chartH = svgH - padT - padB;
          const toX = (i: number) => padL + (count > 1 ? (i / (count - 1)) * chartW : chartW / 2);
          const toY = (rank: number) => padT + ((rank - 1) / (maxRank - 1)) * chartH;
          const points = data.map((p, i) => `${toX(i)},${toY(p.rank)}`).join(" ");
          const rankNums = Array.from({ length: maxRank }, (_, i) => i + 1);

          return (
            <div
              className="rounded-lg"
              style={{
                background: "var(--color-bg-1)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* タブ */}
              {tabs.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    borderBottom: "1px solid var(--color-border)",
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

              <div className="p-4">
                {/* サマリー */}
                {tabs.length === 1 && (
                  <p className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>
                    {tabs[0].label}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-text-3)" }}>対局数</p>
                    <p className="mt-0.5 text-xl font-semibold" style={{ color: "var(--color-text-1)" }}>
                      {st.totalGames}
                      <span className="text-xs font-normal" style={{ color: "var(--color-text-3)" }}>回</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-text-3)" }}>通算スコア</p>
                    <p className="mt-0.5 text-xl font-semibold" style={{ color: "var(--color-text-1)" }}>
                      {formatScore(st.totalScore)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-text-3)" }}>平均順位</p>
                    <p className="mt-0.5 text-xl font-semibold" style={{ color: "var(--color-text-1)" }}>
                      {st.avgRank !== null ? st.avgRank.toFixed(1) : "-"}
                      <span className="text-xs font-normal" style={{ color: "var(--color-text-3)" }}>位</span>
                    </p>
                  </div>
                </div>

                {/* 順位分布 */}
                <div className="mt-3">
                  <p className="mb-1.5 text-xs" style={{ color: "var(--color-text-3)" }}>順位分布</p>
                  <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                    {st.rankDist.map((pct, i) => (
                      <div
                        key={i}
                        style={{
                          width: `${pct}%`,
                          background: RANK_COLORS[i],
                          minWidth: pct > 0 ? "2px" : 0,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex gap-3">
                    {st.rankDist.map((pct, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: RANK_COLORS[i],
                            display: "inline-block",
                          }}
                        />
                        <span className="text-xs" style={{ color: "var(--color-text-2)" }}>
                          {i + 1}位 {pct.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 順位推移グラフ */}
                {count > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs" style={{ color: "var(--color-text-3)" }}>
                      直近{count}戦の順位推移
                    </p>
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      style={{ width: "100%", height: "auto", overflow: "visible" }}
                    >
                      {rankNums.map((rank) => (
                        <g key={rank}>
                          <line
                            x1={padL}
                            y1={toY(rank)}
                            x2={svgW - padR}
                            y2={toY(rank)}
                            stroke="var(--color-border)"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                            opacity={0.6}
                          />
                          <text
                            x={padL - 6}
                            y={toY(rank) + 3.5}
                            fontSize="9"
                            fill="var(--color-text-3)"
                            textAnchor="end"
                          >
                            {rank}位
                          </text>
                        </g>
                      ))}
                      <polyline
                        points={points}
                        fill="none"
                        stroke="var(--arcoblue-6)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {data.map((p, i) => (
                        p.hasYakuman ? (
                          <text
                            key={i}
                            x={toX(i)}
                            y={toY(p.rank)}
                            fontSize="12"
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            😎
                          </text>
                        ) : (
                          <circle
                            key={i}
                            cx={toX(i)}
                            cy={toY(p.rank)}
                            r="3"
                            fill="var(--arcoblue-6)"
                          />
                        )
                      ))}
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
        <button style={{ fontSize: "24px", lineHeight: 1, opacity: 1 }}>🀄</button>
        <button onClick={() => router.push("/history")} style={{ fontSize: "24px", lineHeight: 1 }}>🗒️</button>
        <button onClick={() => router.push("/ranking")} style={{ fontSize: "24px", lineHeight: 1 }}>👑</button>
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
      {/* フッター分の余白 */}
      <div style={{ height: "70px" }} />
    </div>
  );
}
