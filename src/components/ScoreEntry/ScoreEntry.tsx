"use client";

import { useMemo, useState } from "react";

import type { RoomMember } from "@/lib/types/room";
import type { YakumanEntry, TobashiEntry } from "@/lib/types/game";

import Button from "@/components/Button";
import Modal from "@/components/Modal";

import ScoreInputList from "./ScoreInputList";
import YakumanSection from "./YakumanSection";
import TobashiSection from "./TobashiSection";

interface ScoreEntryProps {
  players: RoomMember[];
  playerCount: 3 | 4;
  onConfirm: (
    scores: {
      userId: string;
      displayName: string;
      score: number;
    }[],
    yakumans: YakumanEntry[],
    tobashis: TobashiEntry[],
  ) => void;
}

export default function ScoreEntry({
  players,
  playerCount,
  onConfirm,
}: ScoreEntryProps) {
  /* =======================
   * State
   ======================= */

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [yakumans, setYakumans] = useState<YakumanEntry[]>([]);

  const [tobiIds, setTobiIds] = useState<Set<string>>(new Set());
  const [tobashiIds, setTobashiIds] = useState<Set<string>>(new Set());

  const [showTobashiConfirm, setShowTobashiConfirm] = useState(false);

  /* =======================
   * Handlers
   ======================= */

  const handleChange = (userId: string, value: string) => {
    const cleaned = value.replace(/[^0-9-]/g, "");

    setInputs((prev) => ({
      ...prev,
      [userId]: cleaned,
    }));
  };

  const toggleTobi = (userId: string) => {
    setTobiIds((prev) => {
      const next = new Set(prev);

      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);

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

        setTobiIds((s) => {
          const n = new Set(s);
          n.delete(userId);
          return n;
        });
      }

      return next;
    });
  };

  /* =======================
   * Derived Values
   ======================= */

  const filledEntries = useMemo(() => {
    return players.filter(
      (p) =>
        inputs[p.user_id] !== undefined &&
        inputs[p.user_id] !== "",
    );
  }, [players, inputs]);

  const emptyEntries = useMemo(() => {
    return players.filter(
      (p) =>
        inputs[p.user_id] === undefined ||
        inputs[p.user_id] === "",
    );
  }, [players, inputs]);

  const autoCalcUser =
    emptyEntries.length === 1 ? emptyEntries[0] : null;

  const autoCalcScore = useMemo(() => {
    if (!autoCalcUser) return null;

    const sum = filledEntries.reduce(
      (acc, p) =>
        acc + (parseInt(inputs[p.user_id], 10) || 0),
      0,
    );

    return -sum;
  }, [autoCalcUser, filledEntries, inputs]);

  const allFilled =
    filledEntries.length >= playerCount - 1 &&
    !!autoCalcUser;

  const hasTobi = tobiIds.size > 0;
  const hasTobashi = tobashiIds.size > 0;

  const tobashiIncomplete =
    (hasTobi || hasTobashi) && !(hasTobi && hasTobashi);

  const canConfirm = allFilled;

  /* =======================
   * Confirm Logic
   ======================= */

  const doConfirm = () => {
    if (!autoCalcUser || autoCalcScore === null) return;

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

  /* =======================
   * Render
   ======================= */

  return (
    <div className="flex flex-col gap-4">
      {/* 点数入力 */}
      <ScoreInputList
        players={players}
        inputs={inputs}
        autoCalcUserId={autoCalcUser?.user_id}
        autoCalcScore={autoCalcScore}
        onChange={handleChange}
      />

      {/* 役満 */}
      <YakumanSection
        players={players}
        yakumans={yakumans}
        onAdd={(y) =>
          setYakumans((prev) => [...prev, y])
        }
        onRemove={(i) =>
          setYakumans((prev) =>
            prev.filter((_, j) => j !== i),
          )
        }
      />

      {/* 飛び / 飛ばし */}
      <TobashiSection
        players={players}
        tobiIds={tobiIds}
        tobashiIds={tobashiIds}
        onToggleTobi={toggleTobi}
        onToggleTobashi={toggleTobashi}
      />

      {/* 確定 */}
      <Button onClick={handleConfirm} disabled={!canConfirm}>
        確定
      </Button>

      {/* 飛び確認モーダル */}
      {showTobashiConfirm && (
        <Modal onClose={() => setShowTobashiConfirm(false)}>
          <div className="flex flex-col gap-4 p-2">
            <p className="text-sm font-medium">
              {hasTobi && !hasTobashi
                ? "飛んだ人が選択されていますが、飛ばした人が選択されていません。"
                : "飛ばした人が選択されていますが、飛んだ人が選択されていません。"}
              このまま確定しますか？
            </p>

            <div className="flex gap-2">
              <Button
                variant="tertiary"
                fullWidth
                onClick={() =>
                  setShowTobashiConfirm(false)
                }
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
