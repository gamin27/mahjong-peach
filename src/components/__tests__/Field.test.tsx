import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Field from "../Field";

describe("Field", () => {
  describe("default バリアント", () => {
    it("ラベルを表示する", () => {
      render(
        <Field label="プレイヤー名">
          <input />
        </Field>
      );
      expect(screen.getByText("プレイヤー名")).toBeInTheDocument();
    });

    it("children を表示する", () => {
      render(
        <Field label="プレイヤー名">
          <input placeholder="名前を入力" />
        </Field>
      );
      expect(screen.getByPlaceholderText("名前を入力")).toBeInTheDocument();
    });

    it("className が適用される", () => {
      const { container } = render(
        <Field label="ラベル" className="mt-4">
          <span>内容</span>
        </Field>
      );
      expect(container.firstChild).toHaveClass("mt-4");
    });
  });

  describe("small バリアント", () => {
    it("ラベルと value を表示する", () => {
      render(<Field variant="small" label="スコア" value="+50" />);
      expect(screen.getByText("スコア")).toBeInTheDocument();
      expect(screen.getByText("+50")).toBeInTheDocument();
    });

    it("valueColor が適用される", () => {
      render(
        <Field
          variant="small"
          label="順位"
          value="1位"
          valueColor="var(--arcoblue-6)"
        />
      );
      const valueEl = screen.getByText("1位");
      expect(valueEl).toHaveStyle({ color: "var(--arcoblue-6)" });
    });

    it("valueColor 未指定のとき デフォルト色が適用される", () => {
      render(<Field variant="small" label="スコア" value="+50" />);
      const valueEl = screen.getByText("+50");
      expect(valueEl).toHaveStyle({ color: "var(--color-text-1)" });
    });

    it("className が適用される", () => {
      const { container } = render(
        <Field variant="small" label="スコア" value="+50" className="w-24" />
      );
      expect(container.firstChild).toHaveClass("w-24");
    });
  });
});
