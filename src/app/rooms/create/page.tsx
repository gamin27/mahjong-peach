"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/Input";
import Field from "@/components/Field";
import Main from "@/components/Main";
import Button from "@/components/Button";

export default function CreateRoomPage() {
  const router = useRouter();
  const supabase = createClient();
  const [roomNumber, setRoomNumber] = useState("");
  const [playerCount, setPlayerCount] = useState<3 | 4>(3);
  const [ptRate, setPtRate] = useState("50");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setError("");

    if (!/^\d{4}$/.test(roomNumber)) {
      setError("4桁の数字を入力してください");
      return;
    }

    if (!ptRate || parseInt(ptRate, 10) <= 0) {
      setError("ptレートを入力してください");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const user = session.user;

    const { data: existing } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_number", roomNumber)
      .in("status", ["waiting", "active"])
      .maybeSingle();

    if (existing) {
      setError("このルーム番号は既に使われています");
      setLoading(false);
      return;
    }

    const { data: room, error: insertError } = await supabase
      .from("rooms")
      .insert({
        room_number: roomNumber,
        player_count: playerCount,
        pt_rate: parseInt(ptRate, 10),
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !room) {
      setError(`ルームの作成に失敗しました: ${insertError?.message ?? ""}`);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();
    const displayName = profile?.username ?? "プレイヤー";

    await supabase.from("room_members").insert({
      room_id: room.id,
      user_id: user.id,
      display_name: displayName,
      avatar_url: profile?.avatar_url ?? null,
    });

    router.push(`/rooms/${roomNumber}`);
  };

  return (
    <div style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}>
      <header
        style={{
          background: "var(--color-bg-1)",
          borderBottom: "1px solid var(--color-border)",
          padding: "12px 24px",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{ color: "var(--color-text-3)", fontSize: "14px" }}
        >
          ← 戻る
        </button>
      </header>

      <Main maxWidth="md" className="py-8">
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--color-text-1)",
            marginBottom: "24px",
          }}
        >
          ルームを作成
        </h1>

        <div
          style={{
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Field label="ルーム番号（4桁）" className="mb-5">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={roomNumber}
              onChange={(e) => {
                setRoomNumber(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="例: 1234"
              autoComplete="off"
            />
          </Field>

          <Field label="プレイ人数" className="mb-5">
            <div style={{ display: "flex", gap: "12px" }}>
              {([3, 4] as const).map((count) => (
                <button
                  key={count}
                  onClick={() => setPlayerCount(count)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    borderRadius: "8px",
                    border: `1px solid ${playerCount === count ? "var(--arcoblue-6)" : "var(--color-border)"}`,
                    background: playerCount === count ? "var(--arcoblue-1)" : "var(--color-bg-2)",
                    color: playerCount === count ? "var(--arcoblue-6)" : "var(--color-text-2)",
                    cursor: "pointer",
                  }}
                >
                  {count}人麻雀
                </button>
              ))}
            </div>
          </Field>

          <Field label="ptレート" className="mb-5">
            <Input
              type="text"
              inputMode="numeric"
              value={ptRate}
              onChange={(e) => setPtRate(e.target.value.replace(/\D/g, ""))}
              placeholder="50"
              autoComplete="off"
            />
            <p style={{ fontSize: "12px", color: "var(--color-text-3)", marginTop: "4px" }}>
              1点あたりのpt（必須）
            </p>
          </Field>

          {error && (
            <p style={{ fontSize: "14px", color: "var(--red-6)", marginBottom: "16px" }}>
              {error}
            </p>
          )}

          <Button onClick={handleCreate} disabled={loading} fullWidth>
            {loading ? "作成中..." : "ルームを作成"}
          </Button>
        </div>
      </Main>
    </div>
  );
}
