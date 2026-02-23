import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Modal from "../Modal";

describe("Modal", () => {
  it("children を表示する", () => {
    render(<Modal onClose={vi.fn()}>モーダル本文</Modal>);
    expect(screen.getByText("モーダル本文")).toBeInTheDocument();
  });

  it("バックドロップをクリックすると onClose が呼ばれる", () => {
    const onClose = vi.fn();
    const { container } = render(<Modal onClose={onClose}>内容</Modal>);
    // 最外層の div (バックドロップ) を直接クリック
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("コンテンツ内をクリックしても onClose が呼ばれない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <button>内側ボタン</button>
      </Modal>
    );
    await user.click(screen.getByRole("button", { name: "内側ボタン" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("テキスト内容をクリックしても onClose が呼ばれない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal onClose={onClose}>テキスト内容</Modal>);
    await user.click(screen.getByText("テキスト内容"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
