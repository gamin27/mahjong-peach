"use client";

import { useState, useMemo } from "react";
import type { RoomMember } from "@/lib/types/room";

interface ScoreEntryProps {
  players: RoomMember[];
  playerCount: 3 | 4;
  onConfirm: (scores: { userId: string; displayName: string; score: number }[]) => void;
}

export default function ScoreEntry({
  players,
  playerCount,
  onConfirm,
}: ScoreEntryProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const handleChange = (userId: string, value: string) => {
    // 数字とマイナスのみ許可
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

  // N-1人入力済みなら残り1人を自動計算
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

    onConfirm(scores);
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
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--gray-6)" }}
            >
              {player.display_name.charAt(0)}
            </div>
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
              <input
                type="text"
                inputMode="numeric"
                value={inputs[player.user_id] ?? ""}
                onChange={(e) => handleChange(player.user_id, e.target.value)}
                placeholder="点数"
                style={{
                  width: "100px",
                  padding: "6px 10px",
                  fontSize: "14px",
                  textAlign: "right",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-2)",
                  color: "var(--color-text-1)",
                  outline: "none",
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
    </div>
  );
}
