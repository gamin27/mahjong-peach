"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Room, RoomMember } from "@/lib/types/room";

export default function RoomDetailPage() {
  const params = useParams();
  const roomNumber = params.roomNumber as string;
  const router = useRouter();
  const supabase = createClient();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoom = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*, room_members(*)")
      .eq("room_number", roomNumber)
      .in("status", ["waiting", "active"])
      .maybeSingle();

    if (data) {
      const { room_members, ...roomData } = data;
      setRoom(roomData as Room);
      setMembers(room_members as RoomMember[]);

      if (
        roomData.status === "waiting" &&
        room_members.length >= roomData.player_count
      ) {
        await supabase
          .from("rooms")
          .update({ status: "active" })
          .eq("id", roomData.id);
        setRoom((prev) => (prev ? { ...prev, status: "active" } : prev));
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNumber]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(session.user.id);
    });

    fetchRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMember = payload.new as RoomMember;
            setMembers((prev) => {
              if (prev.some((m) => m.id === newMember.id)) return prev;
              const updated = [...prev, newMember];

              if (
                room.status === "waiting" &&
                updated.length >= room.player_count
              ) {
                supabase
                  .from("rooms")
                  .update({ status: "active" })
                  .eq("id", room.id);
                setRoom((prev) =>
                  prev ? { ...prev, status: "active" } : prev
                );
              }

              return updated;
            });
          }
          if (payload.eventType === "DELETE") {
            const oldMember = payload.old as { id: string };
            setMembers((prev) => prev.filter((m) => m.id !== oldMember.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, room?.player_count]);

  const handleLeave = async () => {
    if (!room || !currentUserId) return;

    await supabase
      .from("room_members")
      .delete()
      .eq("room_id", room.id)
      .eq("user_id", currentUserId);

    router.push("/");
  };

  if (loading) return null;

  if (!room) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--color-bg-2)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <p style={{ color: "var(--color-text-2)" }}>
            ルームが見つかりません
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--arcoblue-6)" }}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  const isCreator = currentUserId === room.created_by;
  const isFull = members.length >= room.player_count;
  const slots = Array.from({ length: room.player_count }, (_, i) => members[i] || null);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--color-bg-2)" }}
    >
      <header
        className="flex items-center justify-between px-6 py-3"
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
          ← ホーム
        </button>
        <button
          onClick={handleLeave}
          className="rounded px-3 py-1 text-xs font-medium"
          style={{
            border: "1px solid var(--red-6)",
            color: "var(--red-6)",
          }}
        >
          退出
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-8">
        {/* ルーム情報 */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--color-text-1)" }}
            >
              ルーム {room.room_number}
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-3)" }}>
              {room.player_count}人麻雀
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: isFull ? "var(--green-1)" : "var(--orange-1)",
              color: isFull ? "var(--green-6)" : "var(--orange-6)",
            }}
          >
            {isFull ? "対局準備OK" : "待機中"}
          </span>
        </div>

        {/* メンバー数 */}
        <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
          {members.length} / {room.player_count} 人参加中
        </p>

        {/* プレイヤースロット */}
        <div className="grid grid-cols-2 gap-4">
          {slots.map((member, i) => (
            <div
              key={member?.id ?? `empty-${i}`}
              className="flex items-center gap-3 rounded-lg p-4"
              style={{
                background: "var(--color-bg-1)",
                border: member
                  ? "1px solid var(--color-border)"
                  : "2px dashed var(--color-border)",
                boxShadow: member ? "var(--shadow-card)" : "none",
              }}
            >
              {member ? (
                <>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{
                      background:
                        member.user_id === currentUserId
                          ? "var(--arcoblue-6)"
                          : "var(--gray-6)",
                    }}
                  >
                    {member.display_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: "var(--color-text-1)" }}
                    >
                      {member.display_name}
                    </p>
                    {member.user_id === room.created_by && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--arcoblue-6)" }}
                      >
                        ホスト
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p
                  className="w-full text-center text-sm"
                  style={{ color: "var(--color-text-3)" }}
                >
                  空席
                </p>
              )}
            </div>
          ))}
        </div>

        {/* 対局開始ボタン */}
        {isFull && isCreator && (
          <button
            className="mt-2 rounded-lg px-4 py-3 text-sm font-semibold text-white"
            style={{ background: "var(--green-6)" }}
          >
            対局を開始
          </button>
        )}
      </main>
    </div>
  );
}
