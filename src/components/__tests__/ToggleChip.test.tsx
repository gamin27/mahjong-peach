import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ToggleChip from "../ToggleChip";

describe("ToggleChip", () => {
  it("ラベルを表示する", () => {
    render(<ToggleChip label="飛び" selected={false} onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "飛び" })).toBeInTheDocument();
  });

  it("selected=true のとき aria-pressed が true", () => {
    render(<ToggleChip label="飛び" selected={true} onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("selected=false のとき aria-pressed が false", () => {
    render(<ToggleChip label="飛び" selected={false} onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("クリックすると onClick が呼ばれる", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ToggleChip label="飛び" selected={false} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled のとき onClick が呼ばれない", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ToggleChip label="飛び" selected={false} disabled onClick={onClick} />
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled のとき disabled 属性が付く", () => {
    render(
      <ToggleChip label="飛び" selected={false} disabled onClick={vi.fn()} />
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
