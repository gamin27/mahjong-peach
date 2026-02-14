"use client";

import { useState, useMemo } from "react";
import type { RoomMember } from "@/lib/types/room";
import type { YakumanEntry, TobashiEntry } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import YakumanModal, { TILE_LABELS } from "@/components/YakumanModal";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Field from "@/components/Field";
import Checkbox from "@/components/Checkbox";

interface ScoreEntryProps {
  players: RoomMember[];
  playerCount: 3 | 4;
  onConfirm: (
    scores: { userId: string; displayName: string; score: number }[],
    yakumans: YakumanEntry[],
    tobashis: TobashiEntry[],
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
  const [tobiIds, setTobiIds] = useState<Set<string>>(new Set()); // 飛んだ人
  const [tobashiIds, setTobashiIds] = useState<Set<string>>(new Set()); // 飛ばした人
  const [showTobashiConfirm, setShowTobashiConfirm] = useState(false);

  const handleChange = (userId: string, value: string) => {
    const cleaned = value.replace(/[^0-9-]/g, "");
    setInputs((prev) => ({ ...prev, [userId]: cleaned }));
  };

  const filledEntries = useMemo(() => {
    return players.filter(
      (p) => inputs[p.user_id] !== undefined && inputs[p.user_id] !== "",
    );
  }, [players, inputs]);

  const emptyEntries = useMemo(() => {
    return players.filter(
      (p) => inputs[p.user_id] === undefined || inputs[p.user_id] === "",
    );
  }, [players, inputs]);

  const autoCalcUser = emptyEntries.length === 1 ? emptyEntries[0] : null;
  const autoCalcScore = useMemo(() => {
    if (!autoCalcUser) return null;
    const sum = filledEntries.reduce(
      (acc, p) => acc + (parseInt(inputs[p.user_id], 10) || 0),
      0,
    );
    return 0 - sum;
  }, [autoCalcUser, filledEntries, inputs]);

  const allFilled = filledEntries.length >= playerCount - 1 && autoCalcUser;

  const hasTobashi = tobashiIds.size > 0;
  const hasTobi = tobiIds.size > 0;
  const tobashiIncomplete = (hasTobashi || hasTobi) && !(hasTobashi && hasTobi);
  const canConfirm = !!allFilled;

  const toggleTobi = (userId: string) => {
    setTobiIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
        // 飛ばしから除外
        setTobashiIds((s) => {
          const n = new Set(s);
          n.delete(userId);
          return n;
        });
      }
      return next;
    });
  };

  const toggleTobashi = (userId: string) => {
    setTobashiIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
        // 飛びから除外
        setTobiIds((s) => {
          const n = new Set(s);
          n.delete(userId);
          return n;
        });
      }
      return next;
    });
  };

  const doConfirm = () => {
    if (autoCalcScore === null || !autoCalcUser) return;

    const scores = players.map((p) => ({
      userId: p.user_id,
      displayName: p.display_name,
      score:
        p.user_id === autoCalcUser.user_id
          ? autoCalcScore
          : parseInt(inputs[p.user_id], 10) || 0,
    }));

    const tobashis: TobashiEntry[] = [
      ...players
        .filter((p) => tobiIds.has(p.user_id))
        .map((p) => ({
          userId: p.user_id,
          displayName: p.display_name,
          type: "tobi" as const,
        })),
      ...players
        .filter((p) => tobashiIds.has(p.user_id))
        .map((p) => ({
          userId: p.user_id,
          displayName: p.display_name,
          type: "tobashi" as const,
        })),
    ];

    onConfirm(scores, yakumans, tobashis);
  };

  const handleConfirm = () => {
    if (!allFilled) return;
    if (tobashiIncomplete) {
      setShowTobashiConfirm(true);
      return;
    }
    doConfirm();
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
                inputMode="text"
                pattern="-?[0-9]*"
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
              <p
                className="flex-1 text-xs font-medium"
                style={{ color: "var(--orange-6)" }}
              >
                {y.displayName} - {y.yakumanType}
                {y.winningTile &&
                  ` / ${TILE_LABELS[y.winningTile] || y.winningTile}`}
              </p>
              <button
                onClick={() =>
                  setYakumans((prev) => prev.filter((_, j) => j !== i))
                }
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

      {/* 飛び / 飛ばし */}
      <div className="gap-4">
        <Field label="飛んだ人">
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <Checkbox
                key={p.user_id}
                label={p.display_name}
                selected={tobiIds.has(p.user_id)}
                disabled={tobashiIds.has(p.user_id)}
                onClick={() => toggleTobi(p.user_id)}
              />
            ))}
          </div>
        </Field>
        <Field label="飛ばした人" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <Checkbox
                key={p.user_id}
                label={p.display_name}
                selected={tobashiIds.has(p.user_id)}
                disabled={tobiIds.has(p.user_id)}
                onClick={() => toggleTobashi(p.user_id)}
              />
            ))}
          </div>
        </Field>
      </div>

      {/* 役満記録ボタン */}
      <Button
        variant="secondary"
        color="orange"
        onClick={() => setShowYakumanModal(true)}
      >
        役満を記録
      </Button>

      <Button onClick={handleConfirm} disabled={!canConfirm}>
        確定
      </Button>

      {showYakumanModal && (
        <YakumanModal
          players={players}
          yakumans={yakumans}
          onAdd={(entry) => setYakumans((prev) => [...prev, entry])}
          onRemove={(index) =>
            setYakumans((prev) => prev.filter((_, i) => i !== index))
          }
          onClose={() => setShowYakumanModal(false)}
        />
      )}

      {showTobashiConfirm && (
        <Modal onClose={() => setShowTobashiConfirm(false)}>
          <div className="flex flex-col gap-4 p-2">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-text-1)" }}
            >
              {hasTobi && !hasTobashi
                ? "飛んだ人が選択されていますが、飛ばした人が選択されていません。"
                : "飛ばした人が選択されていますが、飛んだ人が選択されていません。"}
              このまま確定しますか？
            </p>
            <div className="flex gap-2">
              <Button
                variant="tertiary"
                fullWidth
                onClick={() => setShowTobashiConfirm(false)}
              >
                戻る
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  setShowTobashiConfirm(false);
                  doConfirm();
                }}
              >
                確定する
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
