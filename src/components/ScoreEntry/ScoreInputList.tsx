import Avatar from "@/components/Avatar";
import Input from "@/components/Input";
import type { RoomMember } from "@/lib/types/room";
import Card from "@/components/Card";

interface Props {
  players: RoomMember[];
  inputs: Record<string, string>;
  autoCalcUserId?: string;
  autoCalcScore?: number | null;
  onChange: (userId: string, value: string) => void;
}

export default function ScoreInputList({
  players,
  inputs,
  autoCalcUserId,
  autoCalcScore,
  onChange,
}: Props) {
  return (
    <>
      {players.map((player) => {
        const isAuto = autoCalcUserId === player.user_id;

        return (
          <Card
            key={player.user_id}
            className="flex items-center gap-3 p-4"
            style={{
              border: `1px solid ${
                isAuto ? "var(--arcoblue-6)" : "var(--color-border)"
              }`,
            }}
          >
            <Avatar
              src={player.avatar_url}
              name={player.display_name}
              size={36}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {player.display_name}
              </p>
            </div>

            {isAuto ? (
              <span className="text-sm font-semibold text-[var(--arcoblue-6)]">
                {autoCalcScore?.toLocaleString()}
              </span>
            ) : (
              <Input
                compact
                value={inputs[player.user_id] ?? ""}
                onChange={(e) => onChange(player.user_id, e.target.value)}
                placeholder="点数"
                style={{
                  width: "100px",
                  textAlign: "right",
                }}
              />
            )}
          </Card>
        );
      })}
    </>
  );
}
