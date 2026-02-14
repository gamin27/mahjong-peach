import Field from "@/components/Field";
import Checkbox from "@/components/Checkbox";
import type { RoomMember } from "@/lib/types/room";

interface Props {
  players: RoomMember[];
  tobiIds: Set<string>;
  tobashiIds: Set<string>;
  onToggleTobi: (id: string) => void;
  onToggleTobashi: (id: string) => void;
}

export default function TobashiSection({
  players,
  tobiIds,
  tobashiIds,
  onToggleTobi,
  onToggleTobashi,
}: Props) {
  return (
    <div>
      <Field label="飛んだ人">
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <Checkbox
              key={p.user_id}
              label={p.display_name}
              selected={tobiIds.has(p.user_id)}
              disabled={tobashiIds.has(p.user_id)}
              onClick={() => onToggleTobi(p.user_id)}
            />
          ))}
        </div>
      </Field>

      <Field label="飛ばした人" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <Checkbox
              key={p.user_id}
              label={p.display_name}
              selected={tobashiIds.has(p.user_id)}
              disabled={tobiIds.has(p.user_id)}
              onClick={() => onToggleTobashi(p.user_id)}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}
