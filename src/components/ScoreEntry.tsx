"use client";

import { useState, useMemo } from "react";
import type { RoomMember } from "@/lib/types/room";
import type { YakumanEntry } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import YakumanModal, { TILE_LABELS } from "@/components/YakumanModal";
import Input from "@/components/Input";

interface ScoreEntryProps {
  players: RoomMember[];
  playerCount: 3 | 4;
  onConfirm: (
    scores: { userId: string; displayName: string; score: number }[],
    yakumans: YakumanEntry[]
  ) => void;
}

export default function ScoreEntry({
  players,
  playerCount,
  onConfirm,
}: ScoreEntryProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [yakumans, setYakumans] = useState<YakumanEntry[]>([]);
  const [showYakumanModal, setShowYakumanModal] = useState(false);

  const handleChange = (userId: string, value: string) => {
    const cleaned = value.replace(/[^0-9-]/g, "");
    setInputs((prev) => ({ ...prev, [userId]: cleaned }));
  };

  const filledEntries = useMemo(() => {
    return players.filter(
      (p) => inputs[p.user_id] !== undefined && inputs[p.user_id] !== ""
    );
  }, [players, inputs]);

  const emptyEntries = useMemo(() => {
    return players.filter(
      (p) => inputs[p.user_id] === undefined || inputs[p.user_id] === ""
    );
  }, [players, inputs]);

  const autoCalcUser = emptyEntries.length === 1 ? emptyEntries[0] : null;
  const autoCalcScore = useMemo(() => {
    if (!autoCalcUser) return null;
    const sum = filledEntries.reduce(
      (acc, p) => acc + (parseInt(inputs[p.user_id], 10) || 0),
      0
    );
    return 0 - sum;
  }, [autoCalcUser, filledEntries, inputs]);

  const allFilled = filledEntries.length >= playerCount - 1 && autoCalcUser;

  const handleConfirm = () => {
    if (!allFilled || autoCalcScore === null || !autoCalcUser) return;

    const scores = players.map((p) => ({
      userId: p.user_id,
      displayName: p.display_name,
      score:
        p.user_id === autoCalcUser.user_id
          ? autoCalcScore
          : parseInt(inputs[p.user_id], 10) || 0,
    }));

    onConfirm(scores, yakumans);
  };

  return (
    <div className="flex flex-col gap-4">
      {players.map((player) => {
        const isAuto = autoCalcUser?.user_id === player.user_id;
        return (
          <div
            key={player.user_id}
            className="flex items-center gap-3 rounded-lg p-4"
            style={{
              background: "var(--color-bg-1)",
              border: `1px solid ${isAuto ? "var(--arcoblue-6)" : "var(--color-border)"}`,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <Avatar
              src={player.avatar_url}
              name={player.display_name}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--color-text-1)" }}
              >
                {player.display_name}
              </p>
            </div>
            {isAuto ? (
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--arcoblue-6)" }}
              >
                {autoCalcScore?.toLocaleString()}
              </span>
            ) : (
              <Input
                compact
                type="text"
                inputMode="numeric"
                value={inputs[player.user_id] ?? ""}
                onChange={(e) => handleChange(player.user_id, e.target.value)}
                placeholder="点数"
                style={{
                  width: "100px",
                  padding: "6px 10px",
                  textAlign: "right",
                  borderRadius: "6px",
                }}
              />
            )}
          </div>
        );
      })}

      <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
        {playerCount - 1}人分の点数を入力すると残り1人は自動計算されます
        （合計 ±0）
      </p>

      {/* 役満記録済みリスト */}
      {yakumans.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {yakumans.map((y, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "var(--orange-1)",
                border: "1px solid var(--orange-6)",
              }}
            >
              <Avatar src={y.avatarUrl} name={y.displayName} size={20} />
              <p className="flex-1 text-xs font-medium" style={{ color: "var(--orange-6)" }}>
                {y.displayName} - {y.yakumanType} / {TILE_LABELS[y.winningTile] || y.winningTile}
              </p>
              <button
                onClick={() => setYakumans((prev) => prev.filter((_, j) => j !== i))}
                style={{
                  fontSize: "14px",
                  color: "var(--orange-6)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 役満記録ボタン */}
      <button
        onClick={() => setShowYakumanModal(true)}
        className="rounded-lg px-4 py-3 text-sm font-medium"
        style={{
          border: "1px solid var(--orange-6)",
          color: "var(--orange-6)",
          background: "var(--color-bg-1)",
        }}
      >
        役満を記録
      </button>

      <button
        onClick={handleConfirm}
        disabled={!allFilled}
        className="rounded-lg px-4 py-3 text-sm font-semibold text-white"
        style={{
          background: "var(--arcoblue-6)",
          opacity: allFilled ? 1 : 0.4,
          cursor: allFilled ? "pointer" : "not-allowed",
        }}
      >
        確定
      </button>

      {showYakumanModal && (
        <YakumanModal
          players={players}
          yakumans={yakumans}
          onAdd={(entry) => setYakumans((prev) => [...prev, entry])}
          onRemove={(index) => setYakumans((prev) => prev.filter((_, i) => i !== index))}
          onClose={() => setShowYakumanModal(false)}
        />
      )}
    </div>
  );
}
