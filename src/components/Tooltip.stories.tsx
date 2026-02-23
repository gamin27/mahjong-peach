import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import Tooltip from "./Tooltip";
import Button from "./Button";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    content: (
      <div>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-text-1)",
          }}
        >
          役満
        </p>
        <p style={{ fontSize: "12px", color: "var(--color-text-3)" }}>
          役満を上がった回数
        </p>
      </div>
    ),
    children: <Button size="sm">🀄 ×1</Button>,
  },
};

export const Closed: Story = {
  args: {
    open: false,
    content: "ツールチップ内容",
    children: <Button size="sm">ホバー</Button>,
  },
};

export const Interactive: Story = {
  args: {
    open: false,
    content: "",
    children: null,
  },
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Tooltip
        open={open}
        content={
          <p style={{ fontSize: "12px", color: "var(--color-text-1)" }}>
            クリックで開閉できます
          </p>
        }
      >
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "閉じる" : "開く"}
        </Button>
      </Tooltip>
    );
  },
};
