"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-bg-2)" }}>
      {/* ヘッダー */}
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{
          background: "var(--color-bg-1)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🀄</span>
          <span
            className="text-base font-semibold"
            style={{ color: "var(--color-text-1)" }}
          >
            麻雀ピーチ
          </span>
        </div>
        <nav className="flex items-center gap-5 text-sm" style={{ color: "var(--color-text-2)" }}>
          <span className="cursor-pointer font-medium" style={{ color: "var(--arcoblue-6)" }}>
            ホーム
          </span>
          <span className="cursor-pointer hover:opacity-80">成績一覧</span>
          <span className="cursor-pointer hover:opacity-80">ランキング</span>
          <button
            onClick={handleLogout}
            className="cursor-pointer rounded px-3 py-1 text-xs hover:opacity-80"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
          >
            ログアウト
          </button>
        </nav>
      </header>

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
            { label: "総対局数", value: "0", suffix: "回" },
            { label: "通算スコア", value: "±0", suffix: "" },
            { label: "平均順位", value: "-", suffix: "" },
            { label: "トップ率", value: "-", suffix: "" },
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
    </div>
  );
}
