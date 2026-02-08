"use client";

import { useState, useMemo, Fragment } from "react";
import type { CompletedGame } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import { TILE_LABELS } from "@/components/YakumanModal";
import Input from "@/components/Input";

interface GameResultProps {
  games: CompletedGame[];
  date: string;
  ptRate: number;
  onGoHome: () => void;
  onUpdateScores: (
    gameIndex: number,
    scores: { userId: string; score: number }[]
  ) => Promise<void>;
}

export default function GameResult({
  games,
  date,
  ptRate,
  onGoHome,
  onUpdateScores,
}: GameResultProps) {
  const [editingGameIndex, setEditingGameIndex] = useState<number | null>(null);
  const [editInputs, setEditInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  const sorted = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);

  // 編集モードのバリデーション（合計が0かどうか）
  const editSum = useMemo(() => {
    if (editingGameIndex === null) return 0;
    const game = games[editingGameIndex];
    return game.scores.reduce(
      (acc, s) => acc + (parseInt(editInputs[s.user_id], 10) || 0),
      0
    );
  }, [editingGameIndex, games, editInputs]);

  const allFilled = useMemo(() => {
    if (editingGameIndex === null) return false;
    const game = games[editingGameIndex];
    return game.scores.every(
      (s) => editInputs[s.user_id] !== "" && editInputs[s.user_id] !== undefined
    );
  }, [editingGameIndex, games, editInputs]);

  const canSave = allFilled && editSum === 0;

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
    if (editingGameIndex === null || !canSave) return;
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

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
        {new Date(date).toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        ・ {games.length}半荘
      </p>

      {/* テーブル（累計スコア + 半荘別を統合） */}
      <div
        className="rounded-lg"
        style={{
          background: "var(--color-bg-1)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
          maxHeight: "60vh",
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
              background: "var(--color-bg-1)",
            }}
          >
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th
                className="px-4 py-2.5 text-left text-xs font-medium"
                style={{
                  color: "var(--color-text-3)",
                  position: "sticky",
                  top: 0,
                  background: "var(--color-bg-1)",
                }}
              >
              </th>
              {sorted.map(([userId, data]) => (
                <th
                  key={userId}
                  className="px-3 py-2.5"
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "var(--color-bg-1)",
                  }}
                >
                  <div className="ml-auto flex justify-center">
                    <Avatar
                      src={data.avatarUrl}
                      name={data.displayName}
                      size={32}
                    />
                  </div>
                </th>
              ))}
              <th
                style={{
                  width: "40px",
                  position: "sticky",
                  top: 0,
                  background: "var(--color-bg-1)",
                }}
              />
            </tr>
          </thead>
          <tbody>
            {/* 累計スコア行 */}
            <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
              <td
                className="px-4 py-3 text-xs font-semibold"
                style={{ color: "var(--color-text-1)", whiteSpace: "nowrap" }}
              >
                累計
              </td>
              {sorted.map(([userId, data]) => (
                <td key={userId} className="px-3 py-3 text-right">
                  <p
                    className="text-sm font-semibold"
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
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-text-3)" }}
                  >
                    ({data.total > 0 ? "+" : ""}
                    {(data.total * ptRate).toLocaleString()}pt)
                  </p>
                </td>
              ))}
              <td />
            </tr>

            {/* 半荘別行 */}
            {games.map((g, gi) => {
              const isEditing = editingGameIndex === gi;
              return (
                <Fragment key={g.game.id}>
                  <tr
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <td
                      className="px-4 py-2.5 text-xs font-medium"
                      style={{
                        color: "var(--color-text-3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {gi + 1}半荘
                    </td>
                    {sorted.map(([userId]) => {
                      const score = g.scores.find(
                        (s) => s.user_id === userId
                      )?.score;

                      if (isEditing) {
                        return (
                          <td
                            key={userId}
                            className="px-2 py-2"
                            style={{ textAlign: "right" }}
                          >
                            <Input
                              compact
                              type="text"
                              inputMode="numeric"
                              value={editInputs[userId] ?? ""}
                              onChange={(e) =>
                                handleEditChange(userId, e.target.value)
                              }
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
                          className="px-3 py-2.5 text-right text-sm"
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
                    <td
                      className="px-2 py-2.5"
                      style={{ textAlign: "center" }}
                    >
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
                  </tr>
                  {isEditing && (
                    <tr
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <td
                        colSpan={sorted.length + 2}
                        className="px-4 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="text-xs"
                            style={{
                              color:
                                editSum === 0
                                  ? "var(--color-text-3)"
                                  : "var(--red-6)",
                            }}
                          >
                            合計: {editSum > 0 ? "+" : ""}
                            {editSum.toLocaleString()}
                            {editSum !== 0 && " (±0にしてください)"}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleCancelEdit}
                              className="rounded px-3 py-1.5 text-xs font-medium"
                              style={{
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-2)",
                                background: "var(--color-bg-1)",
                              }}
                            >
                              キャンセル
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={!canSave || saving}
                              className="rounded px-3 py-1.5 text-xs font-medium text-white"
                              style={{
                                background: "var(--arcoblue-6)",
                                opacity: canSave && !saving ? 1 : 0.4,
                                cursor:
                                  canSave && !saving
                                    ? "pointer"
                                    : "not-allowed",
                              }}
                            >
                              {saving ? "保存中..." : "保存"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {g.yakumans && g.yakumans.length > 0 && (
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td
                        colSpan={sorted.length + 2}
                        className="px-4 py-2"
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {g.yakumans.map((y, yi) => (
                            <span
                              key={yi}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                background: "var(--orange-1)",
                                color: "var(--orange-6)",
                                border: "1px solid var(--orange-6)",
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
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={onGoHome}
        className="rounded-lg px-4 py-3 text-sm font-semibold text-white"
        style={{ background: "var(--arcoblue-6)" }}
      >
        ホームに戻る
      </button>
    </div>
  );
}
