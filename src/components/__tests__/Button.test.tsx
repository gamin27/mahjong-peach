import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Button from "../Button";

describe("Button", () => {
  it("children を表示する", () => {
    render(<Button>送信</Button>);
    expect(screen.getByRole("button", { name: "送信" })).toBeInTheDocument();
  });

  it("onClick が呼ばれる", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>クリック</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled のとき onClick が呼ばれない", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        無効
      </Button>
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled 属性が付く", () => {
    render(<Button disabled>無効</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("fullWidth のとき width: 100% が適用される", () => {
    render(<Button fullWidth>全幅</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ width: "100%" });
  });

  it("fullWidth でないとき width が未設定", () => {
    render(<Button>通常幅</Button>);
    const btn = screen.getByRole("button");
    expect(btn.style.width).toBe("");
  });

  it("size=sm のとき font-size が 12px", () => {
    render(<Button size="sm">小さい</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ fontSize: "12px" });
  });

  it("size=md のとき font-size が 14px", () => {
    render(<Button size="md">普通</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ fontSize: "14px" });
  });

  it("ref が button 要素に渡る", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>ボタン</Button>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("BUTTON");
  });
});
