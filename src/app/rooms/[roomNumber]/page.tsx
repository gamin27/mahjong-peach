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

  // フロントで管理: 対局メンバーの user_id セット
  const [playerIds, setPlayerIds] = useState<Set<string>>(new Set());

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
      const membersList = room_members as RoomMember[];
      setMembers(membersList);

      // 初期値: 先着 player_count 人を対局メンバーにする
      setPlayerIds(
        new Set(membersList.slice(0, roomData.player_count).map((m) => m.user_id))
      );
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNumber]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUserId(session.user.id);
      }
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
              return [...prev, newMember];
            });
            // 対局枠に空きがあれば自動で対局に入れる
            setPlayerIds((prev) => {
              if (prev.size < room.player_count) {
                return new Set([...prev, newMember.user_id]);
              }
              return prev;
            });
          }
          if (payload.eventType === "DELETE") {
            const oldMember = payload.old as { id: string; user_id?: string };
            setMembers((prev) => {
              const removed = prev.find((m) => m.id === oldMember.id);
              if (removed) {
                setPlayerIds((ids) => {
                  const next = new Set(ids);
                  next.delete(removed.user_id);
                  return next;
                });
              }
              return prev.filter((m) => m.id !== oldMember.id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.player_count]);

  const handleToggleRole = (member: RoomMember) => {
    setPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(member.user_id)) {
        next.delete(member.user_id);
      } else {
        next.add(member.user_id);
      }
      return next;
    });
  };

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
  const maxMembers = room.player_count + 3;
  const playerCount = members.filter((m) => playerIds.has(m.user_id)).length;
  const waitingCount = members.length - playerCount;
  const isReady = playerCount === room.player_count;
  const isFull = members.length >= maxMembers;

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
              {room.player_count}人麻雀 ＋ 控え最大3人
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: isFull
                ? "var(--red-1)"
                : isReady
                  ? "var(--green-1)"
                  : "var(--orange-1)",
              color: isFull
                ? "var(--red-6)"
                : isReady
                  ? "var(--green-6)"
                  : "var(--orange-6)",
            }}
          >
            {isFull ? "満員" : isReady ? "対局準備OK" : "待機中"}
          </span>
        </div>

        {/* メンバー数 */}
        <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
          {members.length} / {maxMembers} 人参加中
          （対局 {playerCount}/{room.player_count}
          ＋ 控え {waitingCount}/3）
        </p>

        <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
          タップして対局 ↔ 控えを切り替え
        </p>

        {/* メンバー一覧 */}
        <div className="flex flex-col gap-3">
          {members.map((member) => {
            const isPlayer = playerIds.has(member.user_id);
            return (
              <div
                key={member.id}
                onClick={() => handleToggleRole(member)}
                className="flex items-center gap-3 rounded-lg p-4"
                style={{
                  background: "var(--color-bg-1)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                  cursor: "pointer",
                }}
              >
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
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--color-text-1)" }}
                  >
                    {member.display_name}
                  </p>
                  {member.user_id === room.created_by && (
                    <p className="text-xs" style={{ color: "var(--arcoblue-6)" }}>
                      ホスト
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: isPlayer ? "var(--green-1)" : "var(--orange-1)",
                    color: isPlayer ? "var(--green-6)" : "var(--orange-6)",
                  }}
                >
                  {isPlayer ? "対局" : "控え"}
                </span>
              </div>
            );
          })}
        </div>

        {/* 対局開始ボタン */}
        {isCreator && (
          <button
            disabled={!isReady}
            className="mt-2 rounded-lg px-4 py-3 text-sm font-semibold text-white"
            style={{
              background: "var(--green-6)",
              opacity: isReady ? 1 : 0.4,
              cursor: isReady ? "pointer" : "not-allowed",
            }}
          >
            対局を開始
          </button>
        )}
      </main>
    </div>
  );
}
