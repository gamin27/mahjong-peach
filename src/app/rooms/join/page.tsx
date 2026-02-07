"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { RoomMember } from "@/lib/types/room";

export default function JoinRoomPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = async () => {
    setError("");

    if (!user) {
      setError("ログインが必要です");
      return;
    }

    if (!/^\d{4}$/.test(roomNumber)) {
      setError("4桁の数字を入力してください");
      return;
    }

    setLoading(true);

    const { data: room } = await supabase
      .from("rooms")
      .select("*, room_members(*)")
      .eq("room_number", roomNumber)
      .in("status", ["waiting", "active"])
      .maybeSingle();

    if (!room) {
      setError("ルームが見つかりません");
      setLoading(false);
      return;
    }

    const alreadyJoined = (room.room_members as RoomMember[]).some(
      (m) => m.user_id === user.id
    );

    if (!alreadyJoined) {
      if (room.room_members.length >= room.player_count) {
        setError("ルームが満員です");
        setLoading(false);
        return;
      }

      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        "プレイヤー";

      const { error: joinError } = await supabase
        .from("room_members")
        .insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
        });

      if (joinError) {
        setError("参加に失敗しました");
        setLoading(false);
        return;
      }
    }

    router.push(`/rooms/${roomNumber}`);
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--color-bg-2)" }}
    >
      <header
        className="flex items-center gap-2 px-6 py-3"
        style={{
          background: "var(--color-bg-1)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="text-sm"
          style={{ color: "var(--color-text-3)" }}
        >
          ← 戻る
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-1)" }}
        >
          ルームに参加
        </h1>

        <div
          className="flex flex-col gap-5 rounded-lg p-6"
          style={{
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--color-text-1)" }}
            >
              ルーム番号（4桁）
            </label>
            <input
              type="text"
              maxLength={4}
              value={roomNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setRoomNumber(v);
              }}
              placeholder="例: 1234"
              autoComplete="off"
              style={{
                width: "100%",
                padding: "10px 16px",
                fontSize: "14px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-2)",
                color: "var(--color-text-1)",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--red-6)" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleJoin}
            disabled={loading || !user}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--arcoblue-6)" }}
          >
            {loading ? "参加中..." : "ルームに参加"}
          </button>
        </div>
      </main>
    </div>
  );
}
