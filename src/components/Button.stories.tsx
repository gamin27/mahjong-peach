import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary"],
    },
    color: {
      control: "select",
      options: ["blue", "green", "orange", "red"],
    },
    size: { control: "select", options: ["md", "sm"] },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: "ボタン", variant: "primary", color: "blue" },
};

export const Secondary: Story = {
  args: { children: "ボタン", variant: "secondary", color: "blue" },
};

export const Tertiary: Story = {
  args: { children: "ボタン", variant: "tertiary", color: "blue" },
};

export const Small: Story = {
  args: { children: "ボタン", size: "sm" },
};

export const Green: Story = {
  args: { children: "ボタン", color: "green" },
};

export const Orange: Story = {
  args: { children: "ボタン", color: "orange" },
};

export const Red: Story = {
  args: { children: "削除", color: "red" },
};

export const FullWidth: Story = {
  args: { children: "横幅いっぱい", fullWidth: true },
  parameters: { layout: "padded" },
};

export const Disabled: Story = {
  args: { children: "無効", disabled: true },
};
