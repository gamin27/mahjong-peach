"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Room, RoomMember } from "@/lib/types/room";
import type { CompletedGame, YakumanEntry } from "@/lib/types/game";
import PlayerSelection from "@/components/PlayerSelection";
import ScoreEntry from "@/components/ScoreEntry";
import GameResult from "@/components/GameResult";
import Avatar from "@/components/Avatar";
import { TILE_LABELS } from "@/components/YakumanModal";

type Phase = "selecting" | "scoring" | "result";

export default function RoomDetailPage() {
  const params = useParams();
  const roomNumber = params.roomNumber as string;
  const router = useRouter();
  const supabase = createClient();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // フェーズ管理
  const [phase, setPhase] = useState<Phase>("selecting");
  const [playerIds, setPlayerIds] = useState<Set<string>>(new Set());
  const [currentGamePlayers, setCurrentGamePlayers] = useState<RoomMember[]>([]);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const fetchCompletedGames = useCallback(async (roomId: string) => {
    const { data: gamesData } = await supabase
      .from("games")
      .select("*")
      .eq("room_id", roomId)
      .order("round_number", { ascending: true });

    if (!gamesData || gamesData.length === 0) return;

    const gameIds = gamesData.map((g) => g.id);
    const { data: scoresData } = await supabase
      .from("game_scores")
      .select("*")
      .in("game_id", gameIds);

    if (!scoresData) return;

    const { data: yakumanData } = await supabase
      .from("yakuman_records")
      .select("*")
      .in("game_id", gameIds);

    const completed: CompletedGame[] = gamesData.map((game) => ({
      game,
      scores: scoresData.filter((s) => s.game_id === game.id),
      yakumans: yakumanData?.filter((y) => y.game_id === game.id) ?? [],
    }));

    setCompletedGames(completed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      setPlayerIds(
        new Set(membersList.slice(0, roomData.player_count).map((m) => m.user_id))
      );

      await fetchCompletedGames(roomData.id);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNumber, fetchCompletedGames]);

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
            setPlayerIds((prev) => {
              if (prev.size < room.player_count) {
                return new Set([...prev, newMember.user_id]);
              }
              return prev;
            });
          }
          if (payload.eventType === "DELETE") {
            const oldMember = payload.old as { id: string };
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

  // game_scores の変更を監視（ゲスト用）
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`games-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_scores",
        },
        () => {
          fetchCompletedGames(room.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_scores",
        },
        () => {
          fetchCompletedGames(room.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, fetchCompletedGames]);

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

  const handleStartGame = () => {
    if (!room) return;
    const players = members.filter((m) => playerIds.has(m.user_id));
    setCurrentGamePlayers(players);
    setPhase("scoring");
  };

  const handleScoreConfirm = async (
    scores: { userId: string; displayName: string; score: number }[],
    yakumans: YakumanEntry[]
  ) => {
    if (!room) return;

    const roundNumber = completedGames.length + 1;

    const { data: game } = await supabase
      .from("games")
      .insert({ room_id: room.id, round_number: roundNumber })
      .select()
      .single();

    if (!game) return;

    const scoreRows = scores.map((s) => {
      const member = members.find((m) => m.user_id === s.userId);
      return {
        game_id: game.id,
        user_id: s.userId,
        display_name: s.displayName,
        avatar_url: member?.avatar_url ?? null,
        score: s.score,
      };
    });

    await supabase.from("game_scores").insert(scoreRows);

    // 役満記録を保存
    let yakumanRows: { game_id: string; user_id: string; display_name: string; avatar_url: string | null; yakuman_type: string; winning_tile: string }[] = [];
    if (yakumans.length > 0) {
      yakumanRows = yakumans.map((y) => ({
        game_id: game.id,
        user_id: y.userId,
        display_name: y.displayName,
        avatar_url: y.avatarUrl,
        yakuman_type: y.yakumanType,
        winning_tile: y.winningTile,
      }));
      await supabase.from("yakuman_records").insert(yakumanRows);
    }

    setCompletedGames((prev) => [
      ...prev,
      {
        game,
        scores: scoreRows.map((r, i) => ({ ...r, id: `temp-${i}` })),
        yakumans: yakumanRows.map((r, i) => ({ ...r, id: `temp-y-${i}` })),
      },
    ]);

    setPhase("selecting");
  };

  const handleUpdateScores = async (
    gameIndex: number,
    scores: { userId: string; score: number }[]
  ) => {
    const game = completedGames[gameIndex];
    for (const s of scores) {
      await supabase
        .from("game_scores")
        .update({ score: s.score })
        .eq("game_id", game.game.id)
        .eq("user_id", s.userId);
    }
    setCompletedGames((prev) =>
      prev.map((g, i) => {
        if (i !== gameIndex) return g;
        return {
          ...g,
          scores: g.scores.map((sc) => {
            const updated = scores.find((s) => s.userId === sc.user_id);
            return updated ? { ...sc, score: updated.score } : sc;
          }),
        };
      })
    );
  };

  const handleLeave = async () => {
    if (!room || !currentUserId) return;
    const isHost = currentUserId === room.created_by;
    if (isHost) {
      await supabase
        .from("rooms")
        .update({ status: "closed" })
        .eq("id", room.id);
    } else {
      await supabase
        .from("room_members")
        .delete()
        .eq("room_id", room.id)
        .eq("user_id", currentUserId);
    }
    router.push("/");
  };

  if (loading) return null;

  if (!room) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
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
      className="flex flex-col"
      style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
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
        {phase !== "result" && (
          <button
            onClick={() => {
              if (isCreator) {
                setShowLeaveModal(true);
              } else {
                handleLeave();
              }
            }}
            className="rounded px-3 py-1 text-xs font-medium"
            style={{
              border: "1px solid var(--red-6)",
              color: "var(--red-6)",
            }}
          >
            退出
          </button>
        )}
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
              {new Date(room.created_at).toLocaleDateString("ja-JP")} ・ {room.player_count}人麻雀
              {completedGames.length > 0 &&
                ` ・ ${completedGames.length}半荘完了`}
            </p>
          </div>
          {phase === "selecting" && (
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
          )}
          {phase === "scoring" && (
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "var(--arcoblue-1)",
                color: "var(--arcoblue-6)",
              }}
            >
              第{completedGames.length + 1}半荘 点数入力
            </span>
          )}
        </div>

        {/* selecting フェーズ */}
        {phase === "selecting" && (
          <>
            <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
              {members.length} / {maxMembers} 人参加中
              （対局 {playerCount}/{room.player_count}
              ＋ 控え {waitingCount}/3）
            </p>

            {isCreator && (
              <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
                タップして対局 ↔ 控えを切り替え
              </p>
            )}

            <PlayerSelection
              members={members}
              playerIds={playerIds}
              onToggle={isCreator ? handleToggleRole : undefined}
              currentUserId={currentUserId}
              createdBy={room.created_by}
            />

            {isCreator && (
              <button
                disabled={!isReady}
                onClick={handleStartGame}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-white"
                style={{
                  background: "var(--green-6)",
                  opacity: isReady ? 1 : 0.4,
                  cursor: isReady ? "pointer" : "not-allowed",
                }}
              >
                対局を開始
              </button>
            )}

            {completedGames.length > 0 && (
              <button
                onClick={async () => {
                  if (room) await fetchCompletedGames(room.id);
                  setShowResultModal(true);
                }}
                className="rounded-lg px-4 py-3 text-sm font-medium"
                style={{
                  border: "1px solid var(--arcoblue-6)",
                  color: "var(--arcoblue-6)",
                  background: "var(--color-bg-1)",
                }}
              >
                途中結果を見る
              </button>
            )}

            {isCreator && completedGames.length > 0 && (
              <button
                onClick={() => setPhase("result")}
                className="rounded-lg px-4 py-3 text-sm font-medium"
                style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-2)",
                  background: "var(--color-bg-1)",
                }}
              >
                今日の麻雀を終える
              </button>
            )}
          </>
        )}

        {/* scoring フェーズ */}
        {phase === "scoring" && (
          <>
            {isCreator ? (
              <ScoreEntry
                players={currentGamePlayers}
                playerCount={room.player_count}
                onConfirm={handleScoreConfirm}
              />
            ) : (
              <div
                className="flex flex-col items-center gap-3 rounded-lg py-12"
                style={{
                  background: "var(--color-bg-1)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p className="text-2xl">🀄</p>
                <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
                  ホストが点数を入力中です...
                </p>
              </div>
            )}
            {completedGames.length > 0 && (
              <button
                onClick={async () => {
                  if (room) await fetchCompletedGames(room.id);
                  setShowResultModal(true);
                }}
                className="rounded-lg px-4 py-3 text-sm font-medium"
                style={{
                  border: "1px solid var(--arcoblue-6)",
                  color: "var(--arcoblue-6)",
                  background: "var(--color-bg-1)",
                }}
              >
                途中結果を見る
              </button>
            )}
          </>
        )}

        {/* result フェーズ */}
        {phase === "result" && (
          <GameResult
            games={completedGames}
            date={room.created_at}
            ptRate={room.pt_rate}
            onGoHome={async () => {
              if (room) {
                await supabase
                  .from("rooms")
                  .update({ status: "closed" })
                  .eq("id", room.id);
              }
              router.push("/");
            }}
            onUpdateScores={handleUpdateScores}
          />
        )}
      </main>

      {/* 途中結果モーダル */}
      {showResultModal && completedGames.length > 0 && (() => {
        const mid: Record<string, { displayName: string; avatarUrl: string | null; total: number }> = {};
        for (const g of completedGames) {
          for (const s of g.scores) {
            if (!mid[s.user_id]) mid[s.user_id] = { displayName: s.display_name, avatarUrl: s.avatar_url, total: 0 };
            mid[s.user_id].total += s.score;
          }
        }
        const midSorted = Object.entries(mid).sort((a, b) => b[1].total - a[1].total);
        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: "0 24px",
            }}
            onClick={() => setShowResultModal(false)}
          >
            <div
              style={{
                background: "var(--color-bg-1)",
                borderRadius: "12px",
                padding: "24px",
                maxWidth: "420px",
                width: "100%",
                maxHeight: "80vh",
                overflow: "auto",
                boxShadow: "var(--shadow-card)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-1)" }}
              >
                途中結果（{completedGames.length}半荘）
              </p>

              {/* テーブル（累計 + 半荘別を統合） */}
              <div
                className="mt-4 rounded-lg"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-2)",
                  maxHeight: "50vh",
                  overflow: "auto",
                  position: "relative",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      background: "var(--color-bg-2)",
                    }}
                  >
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th
                        className="px-3 py-2 text-left text-xs font-medium"
                        style={{ color: "var(--color-text-3)", background: "var(--color-bg-2)" }}
                      />
                      {midSorted.map(([userId, data]) => (
                        <th key={userId} className="px-2 py-2" style={{ background: "var(--color-bg-2)" }}>
                          <div className="mx-auto flex justify-center" title={data.displayName}>
                            <Avatar
                              src={data.avatarUrl}
                              name={data.displayName}
                              size={28}
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* 累計行 */}
                    <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                      <td
                        className="px-3 py-2.5 text-xs font-semibold"
                        style={{ color: "var(--color-text-1)", whiteSpace: "nowrap" }}
                      >
                        累計
                      </td>
                      {midSorted.map(([userId, data]) => (
                        <td
                          key={userId}
                          className="px-2 py-2.5 text-right text-xs font-semibold"
                          style={{
                            color:
                              data.total > 0
                                ? "var(--green-6)"
                                : data.total < 0
                                  ? "var(--red-6)"
                                  : "var(--color-text-1)",
                          }}
                        >
                          {data.total > 0 ? "+" : ""}
                          {data.total.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    {/* 半荘別行 */}
                    {completedGames.map((g, gi) => (
                      <Fragment key={g.game.id}>
                        <tr
                          style={{ borderBottom: "1px solid var(--color-border)" }}
                        >
                          <td
                            className="px-3 py-2 text-xs font-medium"
                            style={{ color: "var(--color-text-3)", whiteSpace: "nowrap" }}
                          >
                            {gi + 1}半荘
                          </td>
                          {midSorted.map(([userId]) => {
                            const score = g.scores.find((s) => s.user_id === userId)?.score;
                            return (
                              <td
                                key={userId}
                                className="px-2 py-2 text-right text-xs"
                                style={{
                                  color:
                                    score !== undefined && score > 0
                                      ? "var(--green-6)"
                                      : score !== undefined && score < 0
                                        ? "var(--red-6)"
                                        : "var(--color-text-2)",
                                }}
                              >
                                {score !== undefined
                                  ? `${score > 0 ? "+" : ""}${score.toLocaleString()}`
                                  : "-"}
                              </td>
                            );
                          })}
                        </tr>
                        {g.yakumans && g.yakumans.length > 0 && (
                          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td
                              colSpan={midSorted.length + 1}
                              className="px-3 py-1.5"
                            >
                              <div className="flex flex-wrap gap-1">
                                {g.yakumans.map((y, yi) => (
                                  <span
                                    key={yi}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                    style={{
                                      background: "var(--orange-1)",
                                      color: "var(--orange-6)",
                                      border: "1px solid var(--orange-6)",
                                      fontSize: "10px",
                                    }}
                                  >
                                    {y.display_name}: {y.yakuman_type}({TILE_LABELS[y.winning_tile] || y.winning_tile})
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setShowResultModal(false)}
                className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-2)",
                  background: "var(--color-bg-1)",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        );
      })()}

      {/* ホスト退出確認モーダル */}
      {showLeaveModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "0 24px",
          }}
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            style={{
              background: "var(--color-bg-1)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "340px",
              width: "100%",
              boxShadow: "var(--shadow-card)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-1)" }}
            >
              ルームを解散しますか？
            </p>
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--color-text-3)" }}
            >
              ホストが退出するとルームが解散され、全員が退出されます。結果も破棄されます。
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-2)",
                  background: "var(--color-bg-1)",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  handleLeave();
                }}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
                style={{ background: "var(--red-6)" }}
              >
                解散する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
