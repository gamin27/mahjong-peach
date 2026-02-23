import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import TobashiSection from "./TobashiSection";
import { MEMBERS } from "../__fixtures__";

const meta = {
  title: "Components/ScoreEntry/TobashiSection",
  component: TobashiSection,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TobashiSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    players: MEMBERS,
    tobiIds: new Set<string>(),
    tobashiIds: new Set<string>(),
    onToggleTobi: () => {},
    onToggleTobashi: () => {},
  },
};

export const WithSelection: Story = {
  args: {
    players: MEMBERS,
    tobiIds: new Set(["u4"]),
    tobashiIds: new Set(["u1"]),
    onToggleTobi: () => {},
    onToggleTobashi: () => {},
  },
};

export const Interactive: Story = {
  render: () => {
    const [tobiIds, setTobiIds] = useState(new Set<string>());
    const [tobashiIds, setTobashiIds] = useState(new Set<string>());

    const toggle = (
      set: Set<string>,
      setter: (s: Set<string>) => void,
      id: string
    ) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      setter(next);
    };

    return (
      <TobashiSection
        players={MEMBERS}
        tobiIds={tobiIds}
        tobashiIds={tobashiIds}
        onToggleTobi={(id) => toggle(tobiIds, setTobiIds, id)}
        onToggleTobashi={(id) => toggle(tobashiIds, setTobashiIds, id)}
      />
    );
  },
};
