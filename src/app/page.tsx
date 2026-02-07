"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  totalGames: number;
  totalScore: number;
  avgRank: number | null;
  topRate: number | null;
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalGames: 0,
    totalScore: 0,
    avgRank: null,
    topRate: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

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
        .select("game_id, user_id, score")
        .in("game_id", gameIds);

      if (!allScores) return;

      // ゲームごとにグループ化
      const gameMap: Record<string, { user_id: string; score: number }[]> = {};
      for (const s of allScores) {
        if (!gameMap[s.game_id]) gameMap[s.game_id] = [];
        gameMap[s.game_id].push(s);
      }

      let rankSum = 0;
      let topCount = 0;
      for (const gameId of gameIds) {
        const scores = gameMap[gameId];
        if (!scores) continue;
        const sorted = [...scores].sort((a, b) => b.score - a.score);
        const rank = sorted.findIndex((s) => s.user_id === userId) + 1;
        rankSum += rank;
        if (rank === 1) topCount++;
      }

      setStats({
        totalGames,
        totalScore,
        avgRank: rankSum / totalGames,
        topRate: (topCount / totalGames) * 100,
      });
    };

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const formatScore = (v: number) => (v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString());

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-bg-2)" }}>
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

        {/* 統計サマリー */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "総対局数", value: String(stats.totalGames), suffix: "回" },
            { label: "通算スコア", value: stats.totalGames > 0 ? formatScore(stats.totalScore) : "±0", suffix: "" },
            { label: "平均順位", value: stats.avgRank !== null ? stats.avgRank.toFixed(1) : "-", suffix: stats.avgRank !== null ? "位" : "" },
            { label: "トップ率", value: stats.topRate !== null ? stats.topRate.toFixed(0) : "-", suffix: stats.topRate !== null ? "%" : "" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-4"
              style={{
                background: "var(--color-bg-1)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
                {stat.label}
              </p>
              <p
                className="mt-1 text-2xl font-semibold"
                style={{ color: "var(--color-text-1)" }}
              >
                {stat.value}
                <span className="text-sm font-normal" style={{ color: "var(--color-text-3)" }}>
                  {stat.suffix}
                </span>
              </p>
            </div>
          ))}
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

        {/* 最近の対局 */}
        <div
          className="rounded-lg p-5"
          style={{
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>
            最近の対局
          </h2>
          <div
            className="mt-4 flex flex-col items-center justify-center rounded-md py-10"
            style={{ background: "var(--color-bg-2)" }}
          >
            <p className="text-3xl">🀄</p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-3)" }}>
              まだ対局記録がありません
            </p>
            <button
              className="mt-3 rounded px-4 py-1.5 text-xs font-medium text-white"
              style={{ background: "var(--arcoblue-6)" }}
            >
              最初の対局を記録する
            </button>
          </div>
        </div>
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
        <button onClick={handleLogout} style={{ fontSize: "24px", lineHeight: 1 }}>🚪</button>
      </nav>
      {/* フッター分の余白 */}
      <div style={{ height: "70px" }} />
    </div>
  );
}
