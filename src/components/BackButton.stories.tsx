import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BackButton from "./BackButton";

const meta = {
  title: "Components/BackButton",
  component: BackButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomLabel: Story = {
  args: { children: "ルームに戻る" },
};
