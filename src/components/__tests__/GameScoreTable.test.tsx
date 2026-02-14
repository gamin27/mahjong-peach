import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import GameScoreTable from "../GameScoreTable";
import type { CompletedGame } from "@/lib/types/game";
import { describe, it, expect } from "vitest";

// テスト用データ: 3人で1半荘 → 4人で1半荘
function makeTestGames(): CompletedGame[] {
  return [
    {
      game: { id: "g1", room_id: "r1", round_number: 1, created_at: "2025-01-01T10:00:00Z" },
      scores: [
        { id: "s1", game_id: "g1", user_id: "A", display_name: "Alice", avatar_url: null, score: 50 },
        { id: "s2", game_id: "g1", user_id: "B", display_name: "Bob", avatar_url: null, score: 10 },
        { id: "s3", game_id: "g1", user_id: "C", display_name: "Charlie", avatar_url: null, score: -60 },
      ],
      yakumans: [],
    },
    {
      game: { id: "g2", room_id: "r1", round_number: 2, created_at: "2025-01-01T11:00:00Z" },
      scores: [
        { id: "s4", game_id: "g2", user_id: "A", display_name: "Alice", avatar_url: null, score: 30 },
        { id: "s5", game_id: "g2", user_id: "B", display_name: "Bob", avatar_url: null, score: -20 },
        { id: "s6", game_id: "g2", user_id: "C", display_name: "Charlie", avatar_url: null, score: -5 },
        { id: "s7", game_id: "g2", user_id: "D", display_name: "Dave", avatar_url: null, score: -5 },
      ],
      yakumans: [],
    },
  ];
}

// handleUpdateScoresを模倣するラッパーコンポーネント
function Wrapper({ initialGames, ptRate }: { initialGames: CompletedGame[]; ptRate?: number }) {
  const [games, setGames] = useState(initialGames);

  const handleUpdateScores = async (
    gameIndex: number,
    scores: { userId: string; score: number }[],
  ) => {
    setGames((prev) =>
      prev.map((g, i) => {
        if (i !== gameIndex) return g;
        return {
          ...g,
          scores: g.scores.map((sc) => {
            const updated = scores.find((s) => s.userId === sc.user_id);
            return updated ? { ...sc, score: updated.score } : sc;
          }),
        };
      }),
    );
  };

  return (
    <GameScoreTable
      games={games}
      ptRate={ptRate}
      onUpdateScores={handleUpdateScores}
    />
  );
}

// テーブルから累計行のスコアを取得するヘルパー
function getCumulativeScores() {
  const table = screen.getByRole("table");
  const rows = within(table).getAllByRole("row");
  // rows[0] = thead, rows[1] = 累計行
  const cumulativeRow = rows[1];
  const cells = within(cumulativeRow).getAllByRole("cell");
  return cells.map((cell) => cell.textContent?.trim() ?? "");
}

// テーブルからN半荘行のセルを取得
function getGameRowCells(gameIndex: number) {
  const table = screen.getByRole("table");
  const rows = within(table).getAllByRole("row");
  // rows[0] = thead, rows[1] = 累計, rows[2..] = 半荘行
  const gameRow = rows[2 + gameIndex];
  return within(gameRow).getAllByRole("cell");
}

describe("GameScoreTable", () => {
  describe("累計スコア計算", () => {
    it("異なるメンバー構成でも正しく累計を計算する", () => {
      render(<GameScoreTable games={makeTestGames()} />);

      const scores = getCumulativeScores();
      // Alice: 50+30=+80, Bob: 10+(-20)=-10, Charlie: -60+(-5)=-65, Dave: -5
      expect(scores).toEqual(
        expect.arrayContaining([
          expect.stringContaining("+80"),
          expect.stringContaining("-10"),
          expect.stringContaining("-65"),
          expect.stringContaining("-5"),
        ]),
      );
    });

    it("途中参加プレイヤーの不参加ゲームは「-」表示", () => {
      render(<GameScoreTable games={makeTestGames()} />);

      // 1半荘目のDave(4人目)のセルは "-"
      // cells: [label, A, B, C, D]
      const cells = getGameRowCells(0);
      const daveCell = cells[4];
      expect(daveCell.textContent).toBe("-");
    });
  });

  describe("スコア編集", () => {
    it("編集 → 保存で累計が更新される", async () => {
      const user = userEvent.setup();
      render(<Wrapper initialGames={makeTestGames()} ptRate={50} />);

      // 1半荘目の編集ボタンをクリック
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      // 入力欄が3つ表示される (A, B, C のみ。D は1半荘目に不参加)
      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(3);

      // Alice: 50→40, Bob: 10→20, Charlie: -60のまま
      await user.clear(inputs[0]);
      await user.type(inputs[0], "40");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "20");

      // 保存
      await user.click(screen.getByText("保存"));

      // 累計が更新: Alice=40+30=70, Bob=20+(-20)=0, Charlie=-60+(-5)=-65, Dave=-5
      const scores = getCumulativeScores();
      expect(scores.some((s) => s.includes("+70"))).toBe(true); // Alice
      expect(scores.some((s) => s.includes("-65"))).toBe(true); // Charlie
      expect(scores.some((s) => s.includes("-5"))).toBe(true); // Dave
    });

    it("不参加プレイヤーのセルは編集中でも「-」のまま", async () => {
      const user = userEvent.setup();
      render(<Wrapper initialGames={makeTestGames()} />);

      // 1半荘目を編集
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      // 1半荘目のDaveのセルは入力欄ではなく「-」
      // cells: [label, A(input), B(input), C(input), D("-"), editCol]
      const cells = getGameRowCells(0);
      const daveCell = cells[4];
      expect(daveCell.textContent).toBe("-");
      expect(within(daveCell).queryByRole("textbox")).toBeNull();
    });

    it("2半荘目の編集では4人全員の入力欄が表示される", async () => {
      const user = userEvent.setup();
      render(<Wrapper initialGames={makeTestGames()} />);

      // 2半荘目の編集ボタンをクリック
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[1]);

      // 入力欄が4つ表示される (A, B, C, D)
      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(4);
    });

    it("pt換算値も編集後に正しく更新される", async () => {
      const user = userEvent.setup();
      render(<Wrapper initialGames={makeTestGames()} ptRate={50} />);

      // 1半荘目を編集
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "40");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "20");

      await user.click(screen.getByText("保存"));

      // Alice: 70 * 50 = 3,500pt
      const scores = getCumulativeScores();
      expect(scores.some((s) => s.includes("3,500pt"))).toBe(true);
    });

    it("合計が0でないと保存できない", async () => {
      const user = userEvent.setup();
      render(<Wrapper initialGames={makeTestGames()} />);

      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "99");

      const saveButton = screen.getByText("保存");
      expect(saveButton).toBeDisabled();
    });
  });
});
