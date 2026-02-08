"use client";

import { Fragment } from "react";
import type { CompletedGame } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import { TILE_LABELS } from "@/components/YakumanModal";

interface GameScoreTableProps {
  games: CompletedGame[];
  maxHeight?: string;
  ptRate?: number;
}

export default function GameScoreTable({ games, maxHeight = "50vh", ptRate }: GameScoreTableProps) {
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
  const sorted = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);

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
            <th
              className="px-3 py-2 text-left text-xs font-medium"
              style={{ color: "var(--color-text-3)", background: "var(--color-bg-2)" }}
            />
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
          </tr>
          {/* 半荘別行 */}
          {games.map((g, gi) => (
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
                {sorted.map(([userId]) => {
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
                    colSpan={sorted.length + 1}
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
  );
}
