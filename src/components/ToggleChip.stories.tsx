import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ToggleChip from "./ToggleChip";

const meta = {
  title: "Components/ToggleChip",
  component: ToggleChip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    selected: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof ToggleChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {
  args: { label: "立直", selected: false, onClick: () => {} },
};

export const Selected: Story = {
  args: { label: "立直", selected: true, onClick: () => {} },
};

export const Disabled: Story = {
  args: { label: "無効", selected: false, disabled: true, onClick: () => {} },
};

export const DisabledSelected: Story = {
  args: {
    label: "無効（選択中）",
    selected: true,
    disabled: true,
    onClick: () => {},
  },
};
