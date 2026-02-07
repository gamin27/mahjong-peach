import type { RoomMember } from "@/lib/types/room";

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
          <div
            key={member.id}
            onClick={() => onToggle?.(member)}
            className="flex items-center gap-3 rounded-lg p-4"
            style={{
              background: "var(--color-bg-1)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
              cursor: onToggle ? "pointer" : "default",
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{
                background:
                  member.user_id === currentUserId
                    ? "var(--arcoblue-6)"
                    : "var(--gray-6)",
              }}
            >
              {member.display_name.charAt(0)}
            </div>
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
              {isPlayer ? "対局" : "控え"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
