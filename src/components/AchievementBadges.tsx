"use client";

import { useState, useEffect } from "react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { AchievementData } from "@/lib/achievements";
import Tooltip from "@/components/Tooltip";

interface AchievementBadgesProps {
  data: AchievementData;
}

function getCount(data: AchievementData, key: string): number {
  switch (key) {
    case "tobashi": return data.tobashiCount;
    case "flow": return data.flowCount;
    case "fugou": return data.fugouCount;
    case "yakuman": return data.yakumanCount;
    case "antei": return data.anteiCount;
    case "wipeout": return data.wipeoutCount;
    default: return 0;
  }
}

export default function AchievementBadges({ data }: AchievementBadgesProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTooltip) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-achievement-badge]")) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeTooltip]);

  return (
    <div className="flex flex-wrap gap-2">
      {ACHIEVEMENTS.map((def) => {
        if (def.key === "aishou" && !data.aishouName) return null;
        const count = getCount(data, def.key);
        const tooltipId = `${data.userId}:${def.key}`;
        const isOpen = activeTooltip === tooltipId;

        return (
          <Tooltip
            key={def.key}
            open={isOpen}
            content={
              <>
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-1)" }}
                >
                  {def.label}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-3)" }}
                >
                  {def.desc}
                </p>
              </>
            }
          >
            <button
              onClick={() => setActiveTooltip(isOpen ? null : tooltipId)}
              data-achievement-badge
              className="flex items-center gap-1 rounded-full px-3 py-1.5"
              style={{
                background: "var(--color-fill-2)",
                color: "var(--color-text-1)",
                border: `1px solid ${isOpen ? "var(--arcoblue-6)" : "var(--color-border)"}`,
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {def.key === "aishou" ? (
                <span
                  className="font-semibold"
                  style={{ color: "var(--color-text-1)" }}
                >
                  {data.aishouName}{def.icon}
                </span>
              ) : (
                <>
                  <span>{def.icon}</span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--color-text-1)" }}
                  >
                    ×{count}
                  </span>
                </>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
