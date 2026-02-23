import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import Tabs from "./Tabs";

const TABS = [
  { key: "tab1", label: "参加者" },
  { key: "tab2", label: "スコア" },
  { key: "tab3", label: "設定" },
];

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    tabs: TABS,
    activeKey: "tab1",
    onChange: () => {},
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Underline: Story = {
  render: () => {
    const [active, setActive] = useState("tab1");
    return (
      <Tabs
        tabs={TABS}
        activeKey={active}
        onChange={setActive}
        variant="underline"
      />
    );
  },
};

export const UnderlineContained: Story = {
  render: () => {
    const [active, setActive] = useState("tab1");
    return (
      <Tabs
        tabs={TABS}
        activeKey={active}
        onChange={setActive}
        variant="underline"
        contained
      />
    );
  },
};

export const Pill: Story = {
  render: () => {
    const [active, setActive] = useState("tab1");
    return (
      <Tabs
        tabs={TABS}
        activeKey={active}
        onChange={setActive}
        variant="pill"
      />
    );
  },
};
