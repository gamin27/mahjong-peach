import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ScoreEntry from "../ScoreEntry/ScoreEntry";
import type { RoomMember } from "@/lib/types/room";

function makePlayers(count: 3 | 4): RoomMember[] {
  const names = ["Alice", "Bob", "Charlie", "Dave"];
  return names.slice(0, count).map((name, i) => ({
    id: `m${i}`,
    room_id: "r1",
    user_id: `user-${i}`,
    display_name: name,
    avatar_url: null,
    joined_at: "2025-01-01T00:00:00Z",
  }));
}

describe("ScoreEntry", () => {
  describe("入力バリデーション", () => {
    it("正の数値を入力できる", async () => {
      const user = userEvent.setup();
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "50");
      expect(inputs[0]).toHaveValue("50");
    });

    it("先頭のマイナス符号1つを許容する", async () => {
      const user = userEvent.setup();
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "-50");
      expect(inputs[0]).toHaveValue("-50");
    });

    it("複数のマイナス符号は先頭1つに正規化される（ペースト想定）", () => {
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "---50" } });
      expect(inputs[0]).toHaveValue("-50");
    });

    it("末尾のマイナス符号を除去する（ペースト想定）", () => {
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "50-" } });
      expect(inputs[0]).toHaveValue("50");
    });

    it("中間のマイナス符号を除去する（ペースト想定）", () => {
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "5-0" } });
      expect(inputs[0]).toHaveValue("50");
    });

    it("アルファベットなど数字以外を除去する（ペースト想定）", () => {
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "abc50xyz" } });
      expect(inputs[0]).toHaveValue("50");
    });

    it("マイナス付きの不正な入力をまとめて正規化する（ペースト想定）", () => {
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "-5a0-" } });
      expect(inputs[0]).toHaveValue("-50");
    });
  });

  describe("自動計算", () => {
    it("3人中2人入力済みで最後の1人が自動計算される", async () => {
      const user = userEvent.setup();
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "50");
      await user.type(inputs[1], "10");

      // 自動計算: -(50+10) = -60 が表示される
      expect(screen.getByText("-60")).toBeInTheDocument();
    });

    it("4人中3人入力済みで最後の1人が自動計算される", async () => {
      const user = userEvent.setup();
      render(
        <ScoreEntry
          players={makePlayers(4)}
          playerCount={4}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "30");
      await user.type(inputs[1], "20");
      await user.type(inputs[2], "-10");

      // 自動計算: -(30+20-10) = -40
      expect(screen.getByText("-40")).toBeInTheDocument();
    });
  });

  describe("確定ボタン", () => {
    it("入力が足りない場合は確定ボタンが無効", () => {
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText("確定")).toBeDisabled();
    });

    it("必要数入力後は確定ボタンが有効になる", async () => {
      const user = userEvent.setup();
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={vi.fn()}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "50");
      await user.type(inputs[1], "10");

      expect(screen.getByText("確定")).toBeEnabled();
    });

    it("確定するとonConfirmが正しいスコアで呼ばれる", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(
        <ScoreEntry
          players={makePlayers(3)}
          playerCount={3}
          onConfirm={onConfirm}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "50");
      await user.type(inputs[1], "10");
      await user.click(screen.getByText("確定"));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      const [scores] = onConfirm.mock.calls[0];
      expect(scores).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: "user-0", score: 50 }),
          expect.objectContaining({ userId: "user-1", score: 10 }),
          expect.objectContaining({ userId: "user-2", score: -60 }),
        ])
      );
    });
  });
});
