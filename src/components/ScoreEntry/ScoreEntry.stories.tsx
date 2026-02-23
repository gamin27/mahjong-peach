import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ScoreEntry from "./ScoreEntry";
import { MEMBERS } from "../__fixtures__";

const meta = {
  title: "Components/ScoreEntry/ScoreEntry",
  component: ScoreEntry,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScoreEntry>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FourPlayers: Story = {
  args: {
    players: MEMBERS,
    playerCount: 4,
    onConfirm: (scores, yakumans, tobashis) => {
      console.log("confirm", scores, yakumans, tobashis);
    },
  },
};

export const ThreePlayers: Story = {
  args: {
    players: MEMBERS.slice(0, 3),
    playerCount: 3,
    onConfirm: (scores, yakumans, tobashis) => {
      console.log("confirm", scores, yakumans, tobashis);
    },
  },
};
