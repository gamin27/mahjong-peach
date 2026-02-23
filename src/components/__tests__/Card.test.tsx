import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Card from "../Card";

describe("Card", () => {
  it("children を表示する", () => {
    render(<Card>カード内容</Card>);
    expect(screen.getByText("カード内容")).toBeInTheDocument();
  });

  it("追加の className が適用される", () => {
    const { container } = render(<Card className="p-4">内容</Card>);
    expect(container.firstChild).toHaveClass("p-4");
  });

  it("常に rounded-lg クラスを持つ", () => {
    const { container } = render(<Card>内容</Card>);
    expect(container.firstChild).toHaveClass("rounded-lg");
  });

  it("shadow=true (デフォルト) のとき boxShadow が設定される", () => {
    const { container } = render(<Card>内容</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.style.boxShadow).not.toBe("");
  });

  it("shadow=false のとき boxShadow が設定されない", () => {
    const { container } = render(<Card shadow={false}>内容</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.style.boxShadow).toBe("");
  });

  it("style prop が適用される", () => {
    const { container } = render(<Card style={{ padding: "16px" }}>内容</Card>);
    expect(container.firstChild).toHaveStyle({ padding: "16px" });
  });
});
