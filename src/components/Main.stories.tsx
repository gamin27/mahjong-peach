import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Main from "./Main";
import Card from "./Card";

const meta = {
  title: "Components/Main",
  component: Main,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    maxWidth: { control: "select", options: ["md", "lg", "5xl"] },
  },
} satisfies Meta<typeof Main>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleContent = () => (
  <>
    <Card>
      <div style={{ padding: "16px" }}>
        <p style={{ color: "var(--color-text-1)" }}>カード 1</p>
      </div>
    </Card>
    <Card>
      <div style={{ padding: "16px" }}>
        <p style={{ color: "var(--color-text-1)" }}>カード 2</p>
      </div>
    </Card>
  </>
);

export const Default: Story = {
  args: { maxWidth: "lg", children: <SampleContent /> },
};

export const Narrow: Story = {
  args: { maxWidth: "md", children: <SampleContent /> },
};

export const Wide: Story = {
  args: { maxWidth: "5xl", children: <SampleContent /> },
};
