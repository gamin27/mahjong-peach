import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Avatar from "./Avatar";
import DropdownMenu from "./DropdownMenu";

const meta = {
  title: "Components/DropdownMenu",
  component: DropdownMenu,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    trigger: <Avatar name="山田太郎" size={28} />,
    items: [
      { label: "アカウント編集", onClick: () => {}, separator: true },
      { label: "ログアウト", onClick: () => {}, color: "var(--red-6)" },
    ],
  },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TopRight: Story = {
  name: "上・右寄せ（フッターナビ向け）",
  args: { placement: "top-right" },
  decorators: [
    (Story) => (
      <div style={{ paddingTop: "120px" }}>
        <Story />
      </div>
    ),
  ],
};

export const BottomRight: Story = {
  name: "下・右寄せ（デフォルト）",
  args: { placement: "bottom-right" },
  decorators: [
    (Story) => (
      <div style={{ paddingBottom: "120px" }}>
        <Story />
      </div>
    ),
  ],
};

export const BottomLeft: Story = {
  name: "下・左寄せ",
  args: { placement: "bottom-left" },
  decorators: [
    (Story) => (
      <div style={{ paddingBottom: "120px" }}>
        <Story />
      </div>
    ),
  ],
};

export const TopLeft: Story = {
  name: "上・左寄せ",
  args: { placement: "top-left" },
  decorators: [
    (Story) => (
      <div style={{ paddingTop: "120px" }}>
        <Story />
      </div>
    ),
  ],
};

export const ManyItems: Story = {
  name: "多数のアイテム",
  args: {
    placement: "bottom-right",
    minWidth: "200px",
    items: [
      { label: "プロフィール", onClick: () => {} },
      { label: "通知設定", onClick: () => {} },
      { label: "プライバシー", onClick: () => {}, separator: true },
      { label: "ヘルプ", onClick: () => {} },
      { label: "ログアウト", onClick: () => {}, color: "var(--red-6)" },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ paddingBottom: "180px" }}>
        <Story />
      </div>
    ),
  ],
};
