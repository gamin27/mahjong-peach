import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Input from "../Input";

describe("Input", () => {
  it("input 要素として描画される", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("placeholder が表示される", () => {
    render(<Input placeholder="名前を入力" />);
    expect(screen.getByPlaceholderText("名前を入力")).toBeInTheDocument();
  });

  it("value が表示される", () => {
    render(<Input value="テスト" onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("テスト");
  });

  it("onChange が呼ばれる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    await user.type(screen.getByRole("textbox"), "abc");
    expect(onChange).toHaveBeenCalled();
  });

  it("disabled のとき入力できない", async () => {
    const user = userEvent.setup();
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    await user.type(input, "abc");
    expect(input).toHaveValue("");
  });

  it("compact=false のとき width: 100%", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toHaveStyle({ width: "100%" });
  });

  it("compact=true のとき width が未設定", () => {
    render(<Input compact />);
    const input = screen.getByRole("textbox");
    expect(input.style.width).toBe("");
  });

  it("ref が input 要素に渡る", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("INPUT");
  });
});
