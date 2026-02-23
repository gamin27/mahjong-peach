import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Tabs from "../Tabs";

const tabs = [
  { key: "a", label: "タブA" },
  { key: "b", label: "タブB" },
  { key: "c", label: "タブC" },
];

describe("Tabs", () => {
  describe("underline (デフォルト)", () => {
    it("全タブを表示する", () => {
      render(<Tabs tabs={tabs} activeKey="a" onChange={vi.fn()} />);
      expect(screen.getByRole("button", { name: "タブA" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "タブB" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "タブC" })).toBeInTheDocument();
    });

    it("クリックすると onChange が正しい key で呼ばれる", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Tabs tabs={tabs} activeKey="a" onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: "タブB" }));
      expect(onChange).toHaveBeenCalledWith("b");
    });

    it("アクティブタブは onChange が呼ばれる（再選択可能）", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Tabs tabs={tabs} activeKey="a" onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: "タブA" }));
      expect(onChange).toHaveBeenCalledWith("a");
    });
  });

  describe("pill バリアント", () => {
    it("全タブを表示する", () => {
      render(
        <Tabs tabs={tabs} activeKey="a" onChange={vi.fn()} variant="pill" />
      );
      expect(screen.getByRole("button", { name: "タブA" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "タブB" })).toBeInTheDocument();
    });

    it("クリックすると onChange が正しい key で呼ばれる", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Tabs tabs={tabs} activeKey="a" onChange={onChange} variant="pill" />
      );
      await user.click(screen.getByRole("button", { name: "タブC" }));
      expect(onChange).toHaveBeenCalledWith("c");
    });
  });

  describe("数値キー", () => {
    it("number 型の key でも onChange が正しく呼ばれる", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const numTabs = [
        { key: 3, label: "3人" },
        { key: 4, label: "4人" },
      ];
      render(<Tabs tabs={numTabs} activeKey={3} onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: "4人" }));
      expect(onChange).toHaveBeenCalledWith(4);
    });
  });
});
