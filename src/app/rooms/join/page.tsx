"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { RoomMember } from "@/lib/types/room";
import Input from "@/components/Input";
import Field from "@/components/Field";
import Main from "@/components/Main";
import Button from "@/components/Button";
import Card from "@/components/Card";
import BackButton from "@/components/BackButton";

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
      router.replace("/login");
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
      if (room.room_members.length >= room.player_count + 3) {
        setError("ルームが満員です");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      const displayName = profile?.username ?? "プレイヤー";

      const { error: joinError } = await supabase
        .from("room_members")
        .insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          avatar_url: profile?.avatar_url ?? null,
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
      className="flex flex-col"
      style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
    >
      <header
        className="flex items-center gap-2 px-6 py-3"
        style={{
          background: "var(--color-bg-1)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <BackButton onClick={() => router.push("/")} />
      </header>

      <Main maxWidth="md" className="py-8">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-1)" }}
        >
          ルームに参加
        </h1>

        <Card className="flex flex-col gap-5 p-6">
          <Field label="ルーム番号（4桁）">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={roomNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setRoomNumber(v);
              }}
              placeholder="例: 1234"
              autoComplete="off"
            />
          </Field>

          {error && (
            <p className="text-sm" style={{ color: "var(--red-6)" }}>
              {error}
            </p>
          )}

          <Button onClick={handleJoin} disabled={loading}>
            {loading ? "参加中..." : "ルームに参加"}
          </Button>
        </Card>
      </Main>
    </div>
  );
}
