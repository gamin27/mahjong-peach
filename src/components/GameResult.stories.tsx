import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GameResult from "./GameResult";
import { COMPLETED_GAMES, COMPLETED_GAMES_WITH_YAKUMAN } from "./__fixtures__";

const meta = {
  title: "Components/GameResult",
  component: GameResult,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GameResult>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    games: COMPLETED_GAMES,
    date: "2024-01-01T10:00:00Z",
    ptRate: 3,
    onGoHome: () => console.log("go home"),
    onUpdateScores: async (gameIndex, scores) => {
      console.log("update", gameIndex, scores);
    },
  },
};

export const WithYakuman: Story = {
  args: {
    games: COMPLETED_GAMES_WITH_YAKUMAN,
    date: "2024-01-01T10:00:00Z",
    ptRate: 3,
    onGoHome: () => console.log("go home"),
    onUpdateScores: async () => {},
  },
};
