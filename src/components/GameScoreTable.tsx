"use client";

import { useState, useMemo, Fragment } from "react";
import type { CompletedGame } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import Input from "@/components/Input";
import Button from "@/components/Button";

interface GameScoreTableProps {
  games: CompletedGame[];
  maxHeight?: string;
  ptRate?: number;
  showLabel?: boolean;
  onUpdateScores?: (
    gameIndex: number,
    scores: { userId: string; score: number }[]
  ) => Promise<void>;
}

export default function GameScoreTable({ games, maxHeight = "50vh", ptRate, showLabel = true, onUpdateScores }: GameScoreTableProps) {
  const [editingGameIndex, setEditingGameIndex] = useState<number | null>(null);
  const [editInputs, setEditInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (games.length === 0) return null;

  // 累計スコアを計算
  const totals: Record<string, { displayName: string; avatarUrl: string | null; total: number }> = {};
  for (const g of games) {
    for (const s of g.scores) {
      if (!totals[s.user_id]) {
        totals[s.user_id] = { displayName: s.display_name, avatarUrl: s.avatar_url, total: 0 };
      }
      totals[s.user_id].total += s.score;
    }
  }
  // 全ゲームから出現順にユニークなプレイヤーリストを作成
  const seen = new Set<string>();
  const playerOrder: string[] = [];
  for (const g of games) {
    for (const s of g.scores) {
      if (!seen.has(s.user_id)) {
        seen.add(s.user_id);
        playerOrder.push(s.user_id);
      }
    }
  }
  const sorted = playerOrder
    .filter((uid) => totals[uid])
    .map((uid) => [uid, totals[uid]] as [string, (typeof totals)[string]]);

  const editable = !!onUpdateScores;

  const handleStartEdit = (gameIndex: number) => {
    const game = games[gameIndex];
    const inputs: Record<string, string> = {};
    for (const s of game.scores) {
      inputs[s.user_id] = String(s.score);
    }
    setEditInputs(inputs);
    setEditingGameIndex(gameIndex);
  };

  const handleEditChange = (userId: string, value: string) => {
    const cleaned = value.replace(/[^0-9-]/g, "");
    setEditInputs((prev) => ({ ...prev, [userId]: cleaned }));
  };

  const handleCancelEdit = () => {
    setEditingGameIndex(null);
    setEditInputs({});
  };

  const handleSaveEdit = async () => {
    if (editingGameIndex === null || !onUpdateScores) return;
    setSaving(true);
    const game = games[editingGameIndex];
    const scores = game.scores.map((s) => ({
      userId: s.user_id,
      score: parseInt(editInputs[s.user_id], 10) || 0,
    }));
    await onUpdateScores(editingGameIndex, scores);
    setEditingGameIndex(null);
    setEditInputs({});
    setSaving(false);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const editSum = useMemo(() => {
    if (editingGameIndex === null) return 0;
    const game = games[editingGameIndex];
    return game.scores.reduce(
      (acc, s) => acc + (parseInt(editInputs[s.user_id], 10) || 0),
      0
    );
  }, [editingGameIndex, games, editInputs]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const allEditFilled = useMemo(() => {
    if (editingGameIndex === null) return false;
    const game = games[editingGameIndex];
    return game.scores.every(
      (s) => editInputs[s.user_id] !== "" && editInputs[s.user_id] !== undefined
    );
  }, [editingGameIndex, games, editInputs]);

  const canSave = allEditFilled && editSum === 0;

  return (
    <div
      className="rounded-lg"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-2)",
        maxHeight,
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
            {showLabel && (
              <th
                className="px-3 py-2 text-left text-xs font-medium"
                style={{ color: "var(--color-text-3)", background: "var(--color-bg-2)" }}
              />
            )}
            {sorted.map(([userId, data]) => (
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
            {editable && (
              <th style={{ width: "40px", background: "var(--color-bg-2)" }} />
            )}
          </tr>
        </thead>
        <tbody>
          {/* 累計行 */}
          <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
            {showLabel && (
              <td
                className="px-3 py-2.5 text-xs font-semibold"
                style={{ color: "var(--color-text-1)", whiteSpace: "nowrap" }}
              >
                累計
              </td>
            )}
            {sorted.map(([userId, data]) => (
              <td
                key={userId}
                className="px-2 py-2.5 text-right"
                style={{
                  color:
                    data.total > 0
                      ? "var(--green-6)"
                      : data.total < 0
                        ? "var(--red-6)"
                        : "var(--color-text-1)",
                }}
              >
                <span className="text-xs font-semibold">
                  {data.total > 0 ? "+" : ""}
                  {data.total.toLocaleString()}
                </span>
                {ptRate != null && (
                  <p className="text-xs" style={{ color: "var(--color-text-3)", fontWeight: 400 }}>
                    ({data.total > 0 ? "+" : ""}
                    {(data.total * ptRate).toLocaleString()}pt)
                  </p>
                )}
              </td>
            ))}
            {editable && <td />}
          </tr>
          {/* 半荘別行 */}
          {games.map((g, gi) => {
            const isEditing = editingGameIndex === gi;
            return (
              <Fragment key={g.game.id}>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {showLabel && (
                    <td
                      className="px-3 py-2 text-xs font-medium"
                      style={{ color: "var(--color-text-3)", whiteSpace: "nowrap" }}
                    >
                      {gi + 1}半荘
                    </td>
                  )}
                  {sorted.map(([userId]) => {
                    const score = g.scores.find((s) => s.user_id === userId)?.score;

                    if (isEditing) {
                      return (
                        <td
                          key={userId}
                          className="px-1 py-2"
                          style={{ textAlign: "right" }}
                        >
                          <Input
                            compact
                            type="text"
                            inputMode="text"
                            pattern="-?[0-9]*"
                            value={editInputs[userId] ?? ""}
                            onChange={(e) => handleEditChange(userId, e.target.value)}
                            style={{
                              width: "70px",
                              textAlign: "right",
                            }}
                          />
                        </td>
                      );
                    }

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
                  {editable && (
                    <td className="px-2 py-2" style={{ textAlign: "center" }}>
                      {editingGameIndex === null && (
                        <button
                          onClick={() => handleStartEdit(gi)}
                          style={{
                            fontSize: "14px",
                            color: "var(--color-text-3)",
                            cursor: "pointer",
                            lineHeight: 1,
                          }}
                          title="編集"
                        >
                          ✏️
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {isEditing && (
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td colSpan={sorted.length + (editable ? 1 : 0) + (showLabel ? 1 : 0)} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p
                          className="text-xs"
                          style={{
                            color: editSum === 0 ? "var(--color-text-3)" : "var(--red-6)",
                          }}
                        >
                          合計: {editSum > 0 ? "+" : ""}
                          {editSum.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="tertiary" size="sm" onClick={handleCancelEdit}>
                            キャンセル
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!canSave || saving}
                          >
                            {saving ? "保存中..." : "保存"}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
