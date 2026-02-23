import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Field from "./Field";
import Input from "./Input";

const meta = {
  title: "Components/Field",
  component: Field,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "プレイヤー名",
    children: <Input placeholder="名前を入力" />,
  },
};

export const Small: Story = {
  args: {
    variant: "small",
    label: "スコア",
    value: "+50",
  },
};

export const SmallWithColor: Story = {
  args: {
    variant: "small",
    label: "順位",
    value: "1位",
    valueColor: "var(--arcoblue-6)",
  },
};
