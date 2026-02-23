import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Avatar from "./Avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    src: { control: "text" },
    name: { control: "text" },
    size: { control: "number" },
    bg: { control: "color" },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFallback: Story = {
  args: { name: "山田太郎", size: 40 },
};

export const Small: Story = {
  args: { name: "鈴木花子", size: 24 },
};

export const Large: Story = {
  args: { name: "田中一郎", size: 64 },
};

export const CustomColor: Story = {
  args: { name: "佐藤", size: 40, bg: "var(--arcoblue-6)" },
};
