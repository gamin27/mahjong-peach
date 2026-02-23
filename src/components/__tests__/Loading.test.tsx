import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Loading from "../Loading";

describe("Loading", () => {
  it("デフォルトで「読み込み中...」を表示する", () => {
    render(<Loading />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("compact=true のとき「読み込み中...」を表示しない", () => {
    render(<Loading compact />);
    expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
  });

  it("compact=false のとき「読み込み中...」を表示する", () => {
    render(<Loading compact={false} />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("card=true のとき Card コンポーネント内に描画される", () => {
    const { container } = render(<Loading card />);
    // Card は rounded-lg クラスを持つ div を描画する
    const card = container.querySelector(".rounded-lg");
    expect(card).toBeInTheDocument();
  });

  it("card=false (デフォルト) のとき Card ではなく通常の div", () => {
    const { container } = render(<Loading />);
    // Card は border も持つため、border スタイルの有無で確認
    const card = container.firstChild as HTMLElement;
    expect(card.style.border).toBe("");
  });
});
