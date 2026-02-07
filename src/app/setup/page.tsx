"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);

      // 既にプロフィールがあればホームへ
      supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) router.replace("/");
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    setError("");
    const trimmed = username.trim();

    if (trimmed.length < 1 || trimmed.length > 20) {
      setError("1〜20文字で入力してください");
      return;
    }

    if (!userId) {
      router.replace("/login");
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      username: trimmed,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("このユーザー名は既に使われています");
      } else {
        setError(`登録に失敗しました: ${insertError.message}`);
      }
      setLoading(false);
      return;
    }

    router.replace("/");
  };

  return (
    <div style={{ background: "var(--color-bg-2)", minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: "448px",
          margin: "0 auto",
          padding: "80px 24px 32px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "48px" }}>🀄</span>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "var(--color-text-1)",
              marginTop: "12px",
            }}
          >
            ようこそ！
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-3)",
              marginTop: "4px",
            }}
          >
            麻雀ピーチで使うユーザー名を決めてください
          </p>
        </div>

        <div
          style={{
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-text-1)",
                marginBottom: "6px",
              }}
            >
              ユーザー名
            </label>
            <input
              type="text"
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例: たろう"
              autoComplete="off"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 16px",
                fontSize: "14px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-2)",
                color: "var(--color-text-1)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-3)",
                marginTop: "4px",
              }}
            >
              {username.trim().length}/20文字
            </p>
          </div>

          {error && (
            <p
              style={{
                fontSize: "14px",
                color: "var(--red-6)",
                marginBottom: "16px",
              }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !username.trim()}
            style={{
              width: "100%",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "none",
              background: "var(--arcoblue-6)",
              color: "#fff",
              cursor:
                loading || !username.trim() ? "not-allowed" : "pointer",
              opacity: loading || !username.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "登録中..." : "はじめる"}
          </button>
        </div>
      </main>
    </div>
  );
}
