"use client";

import type { CompletedGame } from "@/lib/types/game";
import Avatar from "@/components/Avatar";
import { TILE_LABELS } from "@/components/YakumanModal";
import GameScoreTable from "@/components/GameScoreTable";
import Button from "@/components/Button";
import Card from "@/components/Card";

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

      <GameScoreTable
        games={games}
        maxHeight="60vh"
        ptRate={ptRate}
        onUpdateScores={onUpdateScores}
      />

      {/* 役満記録 */}
      {games.some((g) => g.yakumans && g.yakumans.length > 0) && (
        <Card className="p-4">
          <p
            className="mb-3 text-xs font-semibold"
            style={{ color: "var(--color-text-1)" }}
          >
            役満記録
          </p>
          <div className="flex flex-col gap-2">
            {games.flatMap((g, gi) =>
              (g.yakumans ?? []).map((y, yi) => (
                <div
                  key={`${gi}-${yi}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{
                    background: "var(--orange-1)",
                    border: "1px solid var(--orange-6)",
                  }}
                >
                  <Avatar src={y.avatar_url} name={y.display_name} size={24} />
                  <p
                    className="flex-1 text-xs font-medium"
                    style={{ color: "var(--orange-6)" }}
                  >
                    {y.display_name} - {y.yakuman_type}{y.winning_tile && ` / ${TILE_LABELS[y.winning_tile] || y.winning_tile}`}
                  </p>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-3)" }}
                  >
                    {gi + 1}半荘
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <Button onClick={onGoHome}>
        ホームに戻る
      </Button>
    </div>
  );
}
