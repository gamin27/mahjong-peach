"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { PlayerData } from "@/lib/types/ranking";
import { COLORS } from "../utils";

const ANIM_DURATION = 1.2;

const SVG_W = 340;
const SVG_H = 180;
const PAD_L = 45;
const PAD_R = 10;
const PAD_Y = 16;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_Y * 2;

export function RankingChart({ players }: { players: PlayerData[] }) {
  const allValues = players.flatMap((p) => p.history);
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 0) : 0;
  const minVal = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const range = maxVal - minVal || 1;
  const gameCount = players.length > 0 ? players[0].history.length : 0;

  const toX = (i: number) => PAD_L + (gameCount > 1 ? (i / (gameCount - 1)) * CHART_W : CHART_W / 2);
  const toY = (v: number) => PAD_Y + ((maxVal - v) / range) * CHART_H;

  const yTicks: number[] = [];
  if (range > 0) {
    const rawStep = range / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const nice = [1, 2, 5, 10].find((n) => n * mag >= rawStep)! * mag;
    const start = Math.ceil(minVal / nice) * nice;
    for (let v = start; v <= maxVal; v += nice) {
      yTicks.push(v);
    }
    if (!yTicks.includes(0)) yTicks.push(0);
    yTicks.sort((a, b) => a - b);
  }

  const polyRefs = useRef<(SVGPolylineElement | null)[]>([]);
  const [lengths, setLengths] = useState<number[]>([]);

  const setPolyRef = useCallback(
    (idx: number) => (el: SVGPolylineElement | null) => {
      polyRefs.current[idx] = el;
    },
    [],
  );

  useEffect(() => {
    const ls = polyRefs.current.map((el) => el?.getTotalLength() ?? 0);
    setLengths(ls);
  }, [players, gameCount]);

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--color-bg-1)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p
        className="mb-3 text-sm font-semibold"
        style={{ color: "var(--color-text-1)" }}
      >
        スコア推移
      </p>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: "100%", height: "auto" }}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={toY(v)}
              x2={SVG_W - PAD_R}
              y2={toY(v)}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray={v === 0 ? "4 2" : "2 2"}
              opacity={v === 0 ? 1 : 0.5}
            />
            <text
              x={PAD_L - 6}
              y={toY(v) + 3}
              fontSize="9"
              fill="var(--color-text-3)"
              textAnchor="end"
            >
              {v.toLocaleString()}
            </text>
          </g>
        ))}

        {players.map((p, pi) => {
          const color = COLORS[pi % COLORS.length];
          const points = p.history.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
          const len = lengths[pi] ?? 0;
          const delay = pi * 0.15;
          return (
            <g key={p.userId}>
              <polyline
                ref={setPolyRef(pi)}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={
                  len > 0
                    ? {
                        ["--line-length" as string]: len,
                        strokeDasharray: len,
                        strokeDashoffset: 0,
                        animation: `draw-line ${ANIM_DURATION}s ease-out ${delay}s both`,
                      }
                    : undefined
                }
              />
              {gameCount > 0 && (
                <circle
                  cx={toX(gameCount - 1)}
                  cy={toY(p.history[gameCount - 1])}
                  r="3"
                  fill={color}
                  style={{
                    opacity: 0,
                    animation: `fade-in 0.3s ease-out ${delay + ANIM_DURATION}s forwards`,
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {players.map((p, pi) => (
          <div key={p.userId} className="flex items-center gap-1.5">
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: COLORS[pi % COLORS.length],
                display: "inline-block",
              }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-2)" }}>
              {p.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
