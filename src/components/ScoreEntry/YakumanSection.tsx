import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import YakumanModal, { TILE_LABELS } from "@/components/YakumanModal";
import type { YakumanEntry } from "@/lib/types/game";
import { useState } from "react";

interface Props {
  players: any[];
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
            <div key={i} className="flex gap-2 rounded-lg px-3 py-2 bg-orange-50">
              <Avatar src={y.avatarUrl} name={y.displayName} size={20} />

              <p className="flex-1 text-xs">
                {y.displayName} - {y.yakumanType}
                {y.winningTile &&
                  ` / ${TILE_LABELS[y.winningTile]}`}
              </p>

              <button onClick={() => onRemove(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="secondary"
        color="orange"
        onClick={() => setOpen(true)}
      >
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
