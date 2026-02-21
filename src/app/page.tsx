"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Main from "@/components/Main";
import Tabs from "@/components/Tabs";
import FooterNav from "@/components/FooterNav";
import Loading from "@/components/Loading";
import { computeAchievements } from "@/lib/achievements";
import type { AchievementData } from "@/lib/achievements";
import AchievementBadges from "@/components/AchievementBadges";
import Card from "@/components/Card";

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
  const [myAch3, setMyAch3] = useState<AchievementData | null>(null);
  const [myAch4, setMyAch4] = useState<AchievementData | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const userId = session.user.id;

      // プロフィール、サマリー、自分の参加ゲームIDを並列取得
      const [profileRes, rpcRes, myScoresRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", userId)
          .single(),
        supabase.rpc("get_home_stats", { p_user_id: userId }),
        supabase
          .from("game_scores")
          .select("game_id")
          .eq("user_id", userId),
      ]);

      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url);
        setUsername(profileRes.data.username);
      }

      if (rpcRes.data) {
        const result = rpcRes.data as {
          stats: { player_count: number; total_games: number; total_score: number; avg_rank: number; rank1: number; rank2: number; rank3: number; rank4: number }[];
          history: Record<string, RankPoint[]>;
        };

        for (const s of result.stats) {
          const total = s.total_games;
          const rankCounts = s.player_count === 3
            ? [s.rank1, s.rank2, s.rank3]
            : [s.rank1, s.rank2, s.rank3, s.rank4];
          const modeStats: ModeStats = {
            totalGames: total,
            totalScore: s.total_score,
            avgRank: s.avg_rank,
            rankDist: rankCounts.map((c) => (c / total) * 100),
          };
          if (s.player_count === 3) setStats3(modeStats);
          else setStats4(modeStats);
        }

        const h3 = result.history["3"];
        const h4 = result.history["4"];
        if (h3) setRankHistory3(h3.slice(-30));
        if (h4) setRankHistory4(h4.slice(-30));
      }

      // 実績計算
      const myScores = myScoresRes.data;
      if (myScores && myScores.length > 0) {
        const gameIds = [...new Set(myScores.map((s) => s.game_id))];
        const [gamesRes, allScoresRes, tobashiRes, yakumanRes] =
          await Promise.all([
            supabase
              .from("games")
              .select("id, created_at")
              .in("id", gameIds),
            supabase
              .from("game_scores")
              .select("game_id, user_id, display_name, score")
              .in("game_id", gameIds),
            supabase
              .from("tobashi_records")
              .select("game_id, user_id, type")
              .in("game_id", gameIds),
            supabase
              .from("yakuman_records")
              .select("game_id, user_id")
              .in("game_id", gameIds),
          ]);

        const gamesData = gamesRes.data || [];
        const allScores = allScoresRes.data || [];
        const tobashiRecords = tobashiRes.data || [];
        const yakumanRecords = yakumanRes.data || [];

        // プレイヤー人数でゲームを分類
        const gamePlayerCount: Record<string, number> = {};
        for (const s of allScores) {
          gamePlayerCount[s.game_id] =
            (gamePlayerCount[s.game_id] || 0) + 1;
        }

        for (const pc of [3, 4] as const) {
          const ids = gameIds.filter(
            (id) => gamePlayerCount[id] === pc,
          );
          if (ids.length === 0) continue;
          const result = computeAchievements(
            ids,
            gamesData,
            allScores.filter((s) => ids.includes(s.game_id)),
            tobashiRecords.filter((t) => ids.includes(t.game_id)),
            yakumanRecords.filter((y) => ids.includes(y.game_id)),
          );
          const mine = result.find((a) => a.userId === userId) ?? null;
          if (pc === 3) setMyAch3(mine);
          else setMyAch4(mine);
        }
      }

      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatScore = (v: number) => (v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString());

  return (
    <div className="flex flex-col" style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}>
      {/* メインコンテンツ */}
      <Main maxWidth="5xl">
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

        {/* ローディング */}
        {loading && <Loading card />}

        {/* 成績（タブ切り替え） */}
        {!loading && (stats3.totalGames > 0 || stats4.totalGames > 0) && (() => {
          const tabs: { key: 3 | 4; label: string }[] = [];
          if (stats3.totalGames > 0) tabs.push({ key: 3, label: "3人麻雀" });
          if (stats4.totalGames > 0) tabs.push({ key: 4, label: "4人麻雀" });
          const currentTab = tabs.find((t) => t.key === activeTab) ? activeTab : tabs[0].key;
          const st = currentTab === 3 ? stats3 : stats4;
          const ach = currentTab === 3 ? myAch3 : myAch4;
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
            <Card>
              {/* タブ */}
              {tabs.length > 1 && (
                <Tabs tabs={tabs} activeKey={currentTab} onChange={setActiveTab} />
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

                {/* 実績 */}
                {ach && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs" style={{ color: "var(--color-text-3)" }}>
                      実績
                    </p>
                    <AchievementBadges data={ach} />
                  </div>
                )}
              </div>
            </Card>
          );
        })()}

      </Main>

      <FooterNav active="home" avatarUrl={avatarUrl} username={username} />
    </div>
  );
}
