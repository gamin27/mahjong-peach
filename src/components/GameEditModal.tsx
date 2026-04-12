"use client";

import type {
  CompletedGame,
  YakumanEntry,
  TobashiEntry,
} from "@/lib/types/game";
import type { RoomMember } from "@/lib/types/room";
import Modal from "@/components/Modal";
import ScoreEntry from "@/components/ScoreEntry/ScoreEntry";
import { useState } from "react";
import Button from "@/components/Button";

interface GameEditModalProps {
  game: CompletedGame;
  roundNumber: number;
  onSave: (
    scores: { userId: string; displayName: string; score: number }[],
    yakumans: YakumanEntry[],
    tobashis: TobashiEntry[]
  ) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export default function GameEditModal({
  game,
  roundNumber,
  onSave,
  onDelete,
  onClose,
}: GameEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // GameScore[] → RoomMember[] に変換（ScoreEntry が RoomMember[] を要求するため）
  const players: RoomMember[] = game.scores.map((s) => ({
    id: s.id,
    room_id: game.game.room_id,
    user_id: s.user_id,
    display_name: s.display_name,
    avatar_url: s.avatar_url,
    joined_at: game.game.created_at,
  }));

  const playerCount = game.scores.length as 3 | 4;

  // 最後のプレイヤーを除いてスコアを初期設定（最後のプレイヤーは自動計算される）
  const initialInputs: Record<string, string> = {};
  game.scores.slice(0, -1).forEach((s) => {
    initialInputs[s.user_id] = String(s.score);
  });

  // YakumanRecord[] → YakumanEntry[] に変換
  const initialYakumans: YakumanEntry[] = (game.yakumans ?? []).map((y) => ({
    userId: y.user_id,
    displayName: y.display_name,
    avatarUrl: y.avatar_url,
    yakumanType: y.yakuman_type,
    winningTile: y.winning_tile,
  }));

  // TobashiRecord[] → Set に変換
  const initialTobiIds = new Set(
    (game.tobashis ?? []).filter((t) => t.type === "tobi").map((t) => t.user_id)
  );
  const initialTobashiIds = new Set(
    (game.tobashis ?? [])
      .filter((t) => t.type === "tobashi")
      .map((t) => t.user_id)
  );

  const handleSave = async (
    scores: { userId: string; displayName: string; score: number }[],
    yakumans: YakumanEntry[],
    tobashis: TobashiEntry[]
  ) => {
    setSaving(true);
    try {
      await onSave(scores, yakumans, tobashis);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  if (showDeleteConfirm) {
    return (
      <Modal onClose={() => setShowDeleteConfirm(false)} zIndex={60}>
        <div className="flex flex-col gap-4 p-2">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-1)" }}
          >
            {roundNumber}半荘を削除しますか？
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
            削除したデータは元に戻せません
          </p>
          <div className="flex gap-2">
            <Button
              variant="tertiary"
              fullWidth
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              fullWidth
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: "var(--red-6)",
                borderColor: "var(--red-6)",
              }}
            >
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} zIndex={60}>
      <div className="flex flex-col gap-4">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-1)" }}
        >
          {roundNumber}半荘を編集
        </p>
        {saving ? (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "var(--color-text-3)" }}
          >
            保存中...
          </p>
        ) : (
          <ScoreEntry
            players={players}
            playerCount={playerCount}
            initialInputs={initialInputs}
            initialYakumans={initialYakumans}
            initialTobiIds={initialTobiIds}
            initialTobashiIds={initialTobashiIds}
            confirmLabel="保存"
            onConfirm={handleSave}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        )}
      </div>
    </Modal>
  );
}
