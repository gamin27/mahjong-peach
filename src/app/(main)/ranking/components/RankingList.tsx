import Avatar from "@/components/Avatar";
import type { PlayerData } from "@/lib/types/ranking";
import { COLORS } from "../utils";
import Card from "@/components/Card";
import Icon from "@mdi/react";
import { mdiTrophy } from "@mdi/js";

const RANK_ICONS = [
  { icon: mdiTrophy, color: "#d4a843" },
  { icon: mdiTrophy, color: "#9faec0" },
  { icon: mdiTrophy, color: "#b87333" },
];

export function RankingList({ players }: { players: PlayerData[] }) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((p, i) => (
        <Card key={p.userId} className="flex items-center gap-3 p-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold"
            style={{ color: "var(--color-text-2)" }}
          >
            {i < 3 ? (
              <Icon
                path={RANK_ICONS[i].icon}
                size={0.85}
                color={RANK_ICONS[i].color}
              />
            ) : (
              i + 1
            )}
          </span>
          <Avatar
            src={p.avatarUrl}
            name={p.displayName}
            size={32}
            bg={COLORS[i % COLORS.length]}
          />
          <p
            className="flex-1 text-sm font-medium"
            style={{ color: "var(--color-text-1)" }}
          >
            {p.displayName}
          </p>
          <p
            className="text-sm font-semibold"
            style={{
              color:
                p.totalScore > 0
                  ? "var(--green-6)"
                  : p.totalScore < 0
                    ? "var(--red-6)"
                    : "var(--color-text-1)",
            }}
          >
            {p.totalScore > 0 ? "+" : ""}
            {p.totalScore.toLocaleString()}
          </p>
        </Card>
      ))}
    </div>
  );
}
