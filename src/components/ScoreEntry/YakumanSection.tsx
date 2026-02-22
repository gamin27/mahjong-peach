import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import YakumanModal, { TILE_LABELS } from "@/components/YakumanModal";
import type { YakumanEntry } from "@/lib/types/game";
import type { RoomMember } from "@/lib/types/room";
import { useState } from "react";

interface Props {
  players: RoomMember[];
  yakumans: YakumanEntry[];
  onAdd: (y: YakumanEntry) => void;
  onRemove: (index: number) => void;
}

export default function YakumanSection({
  players,
  yakumans,
  onAdd,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {yakumans.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {yakumans.map((y, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "8px",
                padding: "6px 12px",
                background: "var(--orange-1)",
              }}
            >
              <Avatar src={y.avatarUrl} name={y.displayName} size={20} />

              <p style={{ flex: 1, fontSize: "12px", color: "var(--gray-10)" }}>
                {y.displayName} - {y.yakumanType}
                {y.winningTile && ` / ${TILE_LABELS[y.winningTile]}`}
              </p>

              <button
                onClick={() => onRemove(i)}
                style={{ color: "var(--gray-6)", fontSize: "16px" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" color="orange" onClick={() => setOpen(true)}>
        役満を記録
      </Button>

      {open && (
        <YakumanModal
          players={players}
          yakumans={yakumans}
          onAdd={onAdd}
          onRemove={onRemove}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
