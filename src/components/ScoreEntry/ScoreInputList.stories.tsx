import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import ScoreInputList from "./ScoreInputList";
import { MEMBERS } from "../__fixtures__";

const meta = {
  title: "Components/ScoreEntry/ScoreInputList",
  component: ScoreInputList,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScoreInputList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    players: MEMBERS,
    inputs: {},
    onChange: () => {},
  },
};

export const WithAutoCalc: Story = {
  args: {
    players: MEMBERS,
    inputs: { u1: "50", u2: "-10", u3: "-20" },
    autoCalcUserId: "u4",
    autoCalcScore: -20,
    onChange: () => {},
  },
};

export const Interactive: Story = {
  args: {
    players: MEMBERS,
    inputs: {},
    onChange: () => {},
  },
  render: () => {
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const filled = MEMBERS.filter((p) => inputs[p.user_id]);
    const empty = MEMBERS.filter((p) => !inputs[p.user_id]);
    const autoCalcUser = empty.length === 1 ? empty[0] : null;
    const autoCalcScore = autoCalcUser
      ? -filled.reduce(
          (acc, p) => acc + (parseInt(inputs[p.user_id], 10) || 0),
          0
        )
      : null;

    return (
      <ScoreInputList
        players={MEMBERS}
        inputs={inputs}
        autoCalcUserId={autoCalcUser?.user_id}
        autoCalcScore={autoCalcScore}
        onChange={(userId, value) =>
          setInputs((prev) => ({ ...prev, [userId]: value }))
        }
      />
    );
  },
};
