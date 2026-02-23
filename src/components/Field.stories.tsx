import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Field from "./Field";
import Input from "./Input";

// Field は discriminated union 型のため render を使用し、as Story でキャスト
const meta = {
  title: "Components/Field",
  component: Field,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field label="プレイヤー名">
      <Input placeholder="名前を入力" />
    </Field>
  ),
} as unknown as Story;

export const Small: Story = {
  render: () => <Field variant="small" label="スコア" value="+50" />,
} as unknown as Story;

export const SmallWithColor: Story = {
  render: () => (
    <Field
      variant="small"
      label="順位"
      value="1位"
      valueColor="var(--arcoblue-6)"
    />
  ),
} as unknown as Story;
