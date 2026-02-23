import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import PlayerSelection from "./PlayerSelection";
import { MEMBERS } from "./__fixtures__";

const meta = {
  title: "Components/PlayerSelection",
  component: PlayerSelection,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerSelection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSelected: Story = {
  args: {
    members: MEMBERS,
    playerIds: new Set(MEMBERS.map((m) => m.user_id)),
    currentUserId: "u1",
    createdBy: "u1",
  },
};

export const PartiallySelected: Story = {
  args: {
    members: MEMBERS,
    playerIds: new Set(["u1", "u2"]),
    currentUserId: "u1",
    createdBy: "u1",
  },
};

export const Interactive: Story = {
  render: () => {
    const [playerIds, setPlayerIds] = useState(
      new Set(MEMBERS.map((m) => m.user_id))
    );
    return (
      <PlayerSelection
        members={MEMBERS}
        playerIds={playerIds}
        currentUserId="u1"
        createdBy="u1"
        onToggle={(member) =>
          setPlayerIds((prev) => {
            const next = new Set(prev);
            next.has(member.user_id)
              ? next.delete(member.user_id)
              : next.add(member.user_id);
            return next;
          })
        }
      />
    );
  },
};
