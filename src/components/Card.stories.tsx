import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Card from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    shadow: { control: "boolean" },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    shadow: true,
    children: (
      <div style={{ padding: "16px" }}>
        <p style={{ color: "var(--color-text-1)" }}>カードコンテンツ</p>
      </div>
    ),
  },
};

export const NoShadow: Story = {
  args: {
    shadow: false,
    children: (
      <div style={{ padding: "16px" }}>
        <p style={{ color: "var(--color-text-1)" }}>シャドウなし</p>
      </div>
    ),
  },
};
