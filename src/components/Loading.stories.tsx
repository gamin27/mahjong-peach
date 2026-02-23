import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Loading from "./Loading";

const meta = {
  title: "Components/Loading",
  component: Loading,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    compact: { control: "boolean" },
    card: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Compact: Story = {
  args: { compact: true },
};

export const WithCard: Story = {
  args: { card: true },
};
