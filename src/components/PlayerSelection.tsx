import type { RoomMember } from "@/lib/types/room";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";

interface PlayerSelectionProps {
  members: RoomMember[];
  playerIds: Set<string>;
  onToggle?: (member: RoomMember) => void;
  currentUserId: string | null;
  createdBy: string;
}

export default function PlayerSelection({
  members,
  playerIds,
  onToggle,
  currentUserId,
  createdBy,
}: PlayerSelectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {members.map((member) => {
        const isPlayer = playerIds.has(member.user_id);
        return (
          <Card
            key={member.id}
            data-testid={`member-${member.user_id}`}
            onClick={() => onToggle?.(member)}
            className="flex items-center gap-3 p-4"
            style={{
              cursor: onToggle ? "pointer" : "default",
              opacity: isPlayer ? 1 : 0.45,
              transition: "opacity 0.2s",
            }}
          >
            <Avatar
              src={member.avatar_url}
              name={member.display_name}
              size={36}
              bg={
                member.user_id === currentUserId
                  ? "var(--arcoblue-6)"
                  : "var(--gray-6)"
              }
            />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--color-text-1)" }}
              >
                {member.display_name}
              </p>
              {member.user_id === createdBy && (
                <p className="text-xs" style={{ color: "var(--arcoblue-6)" }}>
                  ホスト
                </p>
              )}
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background: isPlayer ? "var(--green-1)" : "var(--orange-1)",
                color: isPlayer ? "var(--green-6)" : "var(--orange-6)",
              }}
            >
              {isPlayer ? "✅ 対局" : "⬜️ 控え"}
            </span>
          </Card>
        );
      })}
    </div>
  );
}
