"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Room, RoomMember } from "@/lib/types/room";
import type {
  CompletedGame,
  YakumanEntry,
  TobashiEntry,
} from "@/lib/types/game";
import PlayerSelection from "@/components/PlayerSelection";
import ScoreEntry from "@/components/ScoreEntry/ScoreEntry";
import GameResult from "@/components/GameResult";
import GameScoreTable from "@/components/GameScoreTable";
import Main from "@/components/Main";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Loading from "@/components/Loading";
import Card from "@/components/Card";
import BackButton from "@/components/BackButton";

type Phase = "selecting" | "scoring" | "result";

export default function RoomDetailPage() {
  const params = useParams();
  const roomNumber = params.roomNumber as string;
  const router = useRouter();
  const supabase = createClient();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // フェーズ管理
  const [phase, setPhase] = useState<Phase>("selecting");
  const [playerIds, setPlayerIds] = useState<Set<string>>(new Set());
  const [currentGamePlayers, setCurrentGamePlayers] = useState<RoomMember[]>(
    [],
  );
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const closingRef = useRef(false);
  const updatingScoresRef = useRef(false);

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
      const membersList = room_members as RoomMember[];

      // メンバーでなければ入室不可
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (
        !authSession ||
        !membersList.some((m) => m.user_id === authSession.user.id)
      ) {
        setLoading(false);
        return;
      }

      setRoom(roomData as Room);
      setMembers(membersList);

      const pIds = new Set(
        membersList.slice(0, roomData.player_count).map((m) => m.user_id),
      );
      setPlayerIds(pIds);

      await fetchCompletedGames(roomData.id);

      // 控えがいなければ自動的にscoringフェーズへ（ホストのみ）
      if (
        authSession.user.id === roomData.created_by &&
        membersList.length <= roomData.player_count &&
        pIds.size === roomData.player_count
      ) {
        setCurrentGamePlayers(membersList.filter((m) => pIds.has(m.user_id)));
        setPhase("scoring");
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNumber, fetchCompletedGames]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setCurrentUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();
        if (profile?.is_admin) setIsAdmin(true);
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.player_count]);

  // rooms の status 変更を監視（解散検知）
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-status-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated.status === "closed" && !closingRef.current) {
            router.push("/");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

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
          if (!updatingScoresRef.current) {
            fetchCompletedGames(room.id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_scores",
        },
        () => {
          if (!updatingScoresRef.current) {
            fetchCompletedGames(room.id);
          }
        },
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
    yakumans: YakumanEntry[],
    tobashis: TobashiEntry[],
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
    let yakumanRows: {
      game_id: string;
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      yakuman_type: string;
      winning_tile: string | null;
    }[] = [];
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

    // 飛び・飛ばし記録を保存
    if (tobashis.length > 0) {
      const tobashiRows = tobashis.map((t) => ({
        game_id: game.id,
        user_id: t.userId,
        display_name: t.displayName,
        type: t.type,
      }));
      await supabase.from("tobashi_records").insert(tobashiRows);
    }

    setCompletedGames((prev) => [
      ...prev,
      {
        game,
        scores: scoreRows.map((r, i) => ({ ...r, id: `temp-${i}` })),
        yakumans: yakumanRows.map((r, i) => ({ ...r, id: `temp-y-${i}` })),
      },
    ]);

    // 控えがいなければ選択フェーズをスキップ
    if (members.length <= room.player_count) {
      setPhase("scoring");
    } else {
      setPhase("selecting");
    }

    window.scrollTo({ top: 0 });
  };

  const handleUpdateScores = async (
    gameIndex: number,
    scores: { userId: string; score: number }[],
  ) => {
    const game = completedGames[gameIndex];
    updatingScoresRef.current = true;

    // 楽観的にローカル state を即時更新（UIに即反映）
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
      }),
    );

    // DB を更新（各行を主キーで特定して更新）
    try {
      for (const s of scores) {
        const row = game.scores.find((sc) => sc.user_id === s.userId);
        if (!row) continue;
        const { data, error } = await supabase
          .from("game_scores")
          .update({ score: s.score })
          .eq("id", row.id)
          .select();
        if (error) {
          console.error("score update failed:", error);
        } else if (!data || data.length === 0) {
          // 主キーで見つからない場合は game_id + user_id でフォールバック
          await supabase
            .from("game_scores")
            .update({ score: s.score })
            .eq("game_id", game.game.id)
            .eq("user_id", s.userId);
        }
      }
    } finally {
      setTimeout(() => {
        updatingScoresRef.current = false;
      }, 1000);
    }
  };

  const handleLeave = async () => {
    if (!room || !currentUserId) return;
    const isHost = currentUserId === room.created_by || isAdmin;
    if (isHost) {
      closingRef.current = true;
      await supabase
        .from("rooms")
        .update({ status: "closed" })
        .eq("id", room.id);
      // 対局結果があれば結果画面を表示
      if (completedGames.length > 0) {
        setPhase("result");
      } else {
        router.push("/");
      }
    } else {
      await supabase
        .from("room_members")
        .delete()
        .eq("room_id", room.id)
        .eq("user_id", currentUserId);
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div
        className="flex flex-col"
        style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
      >
        <Main>
          <Loading />
        </Main>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
      >
        <div className="flex flex-col items-center gap-3">
          <p style={{ color: "var(--color-text-2)" }}>ルームが見つかりません</p>
          <Button onClick={() => router.push("/")}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  const isCreator = currentUserId === room.created_by || isAdmin;
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
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="text-sm"
          style={{ color: "var(--color-text-3)" }}
        >
          ← ホーム
        </button>
        {isCreator && phase !== "result" && (
          <Button
            size="sm"
            onClick={async () => {
              if (room) await fetchCompletedGames(room.id);
              setShowLeaveModal(true);
            }}
          >
            今日の麻雀を終える
          </Button>
        )}
      </header>

      <Main className="py-8">
        {/* ルーム情報 */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--color-text-1)" }}
            >
              ルーム {room.room_number}
            </h1>
            <p
              className="mt-0.5 text-xs"
              style={{ color: "var(--color-text-3)" }}
            >
              {new Date(room.created_at).toLocaleDateString("ja-JP")} ・{" "}
              {room.player_count}人麻雀
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
              <Button
                color="green"
                disabled={!isReady}
                onClick={handleStartGame}
              >
                対局を開始
              </Button>
            )}

            {(completedGames.length > 0 || !isCreator) && (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (room) await fetchCompletedGames(room.id);
                  setShowResultModal(true);
                }}
              >
                途中結果を見る
              </Button>
            )}
          </>
        )}

        {/* scoring フェーズ */}
        {phase === "scoring" && (
          <>
            {isCreator ? (
              <>
                {members.length > room.player_count && (
                  <BackButton
                    className="self-start"
                    onClick={() => {
                      setPhase("selecting");
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    対局者選択に戻る
                  </BackButton>
                )}
                <ScoreEntry
                  key={completedGames.length}
                  players={currentGamePlayers}
                  playerCount={room.player_count}
                  onConfirm={handleScoreConfirm}
                />
              </>
            ) : (
              <Card shadow={false} className="flex flex-col items-center gap-3 py-12">
                <p className="text-2xl">🀄</p>
                <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
                  ホストが点数を入力中です...
                </p>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/")}
                  style={{ marginTop: "8px" }}
                >
                  ホームに戻る
                </Button>
              </Card>
            )}
            {(completedGames.length > 0 || !isCreator) && (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (room) await fetchCompletedGames(room.id);
                  setShowResultModal(true);
                }}
              >
                途中結果を見る
              </Button>
            )}
          </>
        )}

        {/* result フェーズ */}
        {phase === "result" && (
          <GameResult
            games={completedGames}
            date={room.created_at}
            ptRate={room.pt_rate}
            onGoHome={() => router.push("/")}
            onUpdateScores={handleUpdateScores}
          />
        )}
      </Main>

      {/* 途中結果モーダル / ホスト退出確認モーダル */}
      {(showResultModal || showLeaveModal) && (
        <Modal
          onClose={() => {
            setShowResultModal(false);
            setShowLeaveModal(false);
          }}
        >
          {showLeaveModal ? (
            <>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-1)" }}
              >
                この内容で確定しますか？
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--color-text-3)" }}
              >
                確定後は変更できません
              </p>
            </>
          ) : (
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-1)" }}
            >
              途中結果
              {completedGames.length > 0 && `（${completedGames.length}半荘）`}
            </p>
          )}

          {completedGames.length === 0 ? (
            <div
              className="mt-4 flex flex-col items-center gap-2 py-8"
              style={{ color: "var(--color-text-3)" }}
            >
              <p className="text-2xl">🀄</p>
              <p className="text-sm">まだ対局結果がありません</p>
            </div>
          ) : (
            <div className="mt-4">
              <GameScoreTable
                games={completedGames}
                ptRate={room.pt_rate}
                onUpdateScores={isCreator ? handleUpdateScores : undefined}
              />
            </div>
          )}

          {showLeaveModal ? (
            <div className="mt-5 flex gap-3">
              <Button
                variant="tertiary"
                onClick={() => setShowLeaveModal(false)}
                style={{ flex: 1 }}
              >
                戻る
              </Button>
              <Button
                onClick={() => {
                  setShowLeaveModal(false);
                  handleLeave();
                }}
                style={{ flex: 1 }}
              >
                確定する
              </Button>
            </div>
          ) : (
            <Button
              variant="tertiary"
              fullWidth
              onClick={() => setShowResultModal(false)}
              style={{
                marginTop: completedGames.length === 0 ? "8px" : "16px",
              }}
            >
              閉じる
            </Button>
          )}
        </Modal>
      )}
    </div>
  );
}
