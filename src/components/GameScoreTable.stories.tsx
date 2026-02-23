import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GameScoreTable from "./GameScoreTable";
import { COMPLETED_GAMES, COMPLETED_GAMES_WITH_YAKUMAN } from "./__fixtures__";

const meta = {
  title: "Components/GameScoreTable",
  component: GameScoreTable,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GameScoreTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { games: COMPLETED_GAMES },
};

export const WithPtRate: Story = {
  args: { games: COMPLETED_GAMES, ptRate: 3 },
};

export const Editable: Story = {
  args: {
    games: COMPLETED_GAMES,
    ptRate: 3,
    onUpdateScores: async (gameIndex, scores) => {
      console.log("updateScores", gameIndex, scores);
    },
  },
};

export const NoLabel: Story = {
  args: { games: COMPLETED_GAMES, showLabel: false },
};
