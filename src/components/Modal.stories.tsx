import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center" }}>
        <Button onClick={() => setOpen(true)}>モーダルを開く</Button>
        {open && (
          <Modal onClose={() => setOpen(false)}>
            <div style={{ padding: "8px" }}>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-1)", marginBottom: "12px" }}
              >
                確認
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-2)", marginBottom: "20px" }}
              >
                この操作を実行してもよいですか？
              </p>
              <div className="flex gap-2">
                <Button
                  variant="tertiary"
                  fullWidth
                  onClick={() => setOpen(false)}
                >
                  キャンセル
                </Button>
                <Button fullWidth onClick={() => setOpen(false)}>
                  確定
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  },
};
