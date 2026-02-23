import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Input from "./Input";

const meta = {
  title: "Components/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    compact: { control: "boolean" },
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "テキストを入力" },
};

export const Compact: Story = {
  args: { placeholder: "0", compact: true },
};

export const Disabled: Story = {
  args: { placeholder: "無効", disabled: true },
};

export const WithValue: Story = {
  args: { defaultValue: "山田太郎" },
};
