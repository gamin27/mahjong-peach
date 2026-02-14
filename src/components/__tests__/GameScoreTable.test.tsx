import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, useRef, useCallback } from "react";
import GameScoreTable from "../GameScoreTable";
import type { CompletedGame } from "@/lib/types/game";
import { describe, it, expect, vi } from "vitest";

type OnUpdateSpy = (
  gameIndex: number,
  scores: { userId: string; score: number }[],
) => void;


// テスト用データ: 3人で1半荘 → 4人で1半荘
function makeTestGames(): CompletedGame[] {
  return [
    {
      game: {
        id: "g1",
        room_id: "r1",
        round_number: 1,
        created_at: "2025-01-01T10:00:00Z",
      },
      scores: [
        {
          id: "s1",
          game_id: "g1",
          user_id: "A",
          display_name: "Alice",
          avatar_url: null,
          score: 50,
        },
        {
          id: "s2",
          game_id: "g1",
          user_id: "B",
          display_name: "Bob",
          avatar_url: null,
          score: 10,
        },
        {
          id: "s3",
          game_id: "g1",
          user_id: "C",
          display_name: "Charlie",
          avatar_url: null,
          score: -60,
        },
      ],
      yakumans: [],
    },
    {
      game: {
        id: "g2",
        room_id: "r1",
        round_number: 2,
        created_at: "2025-01-01T11:00:00Z",
      },
      scores: [
        {
          id: "s4",
          game_id: "g2",
          user_id: "A",
          display_name: "Alice",
          avatar_url: null,
          score: 30,
        },
        {
          id: "s5",
          game_id: "g2",
          user_id: "B",
          display_name: "Bob",
          avatar_url: null,
          score: -20,
        },
        {
          id: "s6",
          game_id: "g2",
          user_id: "C",
          display_name: "Charlie",
          avatar_url: null,
          score: -5,
        },
        {
          id: "s7",
          game_id: "g2",
          user_id: "D",
          display_name: "Dave",
          avatar_url: null,
          score: -5,
        },
      ],
      yakumans: [],
    },
  ];
}

// ===== 旧: stateのみ直接更新するWrapper（コンポーネントUI検証用） =====
function Wrapper({
  initialGames,
  ptRate,
}: {
  initialGames: CompletedGame[];
  ptRate?: number;
}) {
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

// ===== 新: DB (ref) を経由して再fetchするWrapper =====
// 実際の handleUpdateScores → fetchCompletedGames と同等のフローを再現
function WrapperWithDB({
  initialGames,
  ptRate,
  onUpdateSpy,
}: {
  initialGames: CompletedGame[];
  ptRate?: number;
  onUpdateSpy?: OnUpdateSpy;
}) {
  const dbRef = useRef<CompletedGame[]>(structuredClone(initialGames));
  const [games, setGames] = useState(initialGames);

  // DB (ref) からデータを再取得して state に反映 = fetchCompletedGames 相当
  const refetchFromDB = useCallback(() => {
    setGames(structuredClone(dbRef.current));
  }, []);

  const handleUpdateScores = async (
    gameIndex: number,
    scores: { userId: string; score: number }[],
  ) => {
    if (onUpdateSpy) {
      onUpdateSpy(gameIndex, scores);
    }

    // 1. DB (ref) を更新 = supabase.update() 相当
    dbRef.current = dbRef.current.map((g, i) => {
      if (i !== gameIndex) return g;
      return {
        ...g,
        scores: g.scores.map((sc) => {
          const updated = scores.find((s) => s.userId === sc.user_id);
          return updated ? { ...sc, score: updated.score } : sc;
        }),
      };
    });

    // 2. DB から再取得して state に反映 = fetchCompletedGames 相当
    refetchFromDB();
  };

  return (
    <>
      <GameScoreTable
        games={games}
        ptRate={ptRate}
        onUpdateScores={handleUpdateScores}
      />
      {/* Realtimeの再fetchをシミュレートするボタン */}
      <button onClick={refetchFromDB} data-testid="simulate-refetch">
        refetch
      </button>
    </>
  );
}

// ===== DB更新がサイレントに失敗するWrapper =====
// RLSポリシー未適用など、update が 0行マッチで何も変更しないケースを再現
function WrapperWithFailingDB({
  initialGames,
  ptRate,
  onUpdateSpy,
}: {
  initialGames: CompletedGame[];
  ptRate?: number;
  onUpdateSpy?: OnUpdateSpy;
}) {
  const dbRef = useRef<CompletedGame[]>(structuredClone(initialGames));
  const [games, setGames] = useState(initialGames);

  const refetchFromDB = useCallback(() => {
    setGames(structuredClone(dbRef.current));
  }, []);

  const handleUpdateScores = async (
    gameIndex: number,
    scores: { userId: string; score: number }[],
  ) => {
    onUpdateSpy?.(gameIndex, scores);

    // 楽観的に state だけ更新（実際のコードと同様）
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

    // ❌ DB (ref) は更新しない = RLS で 0行マッチのシミュレーション
  };

  return (
    <>
      <GameScoreTable
        games={games}
        ptRate={ptRate}
        onUpdateScores={handleUpdateScores}
      />
      <button onClick={refetchFromDB} data-testid="simulate-refetch">
        refetch
      </button>
    </>
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

  describe("結果画面で編集→戦績反映の回帰テスト（DB経由）", () => {
    it("編集→保存でDBが更新され、再fetchしても編集後の累計が維持される", async () => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(
        <WrapperWithDB
          initialGames={makeTestGames()}
          ptRate={50}
          onUpdateSpy={spy}
        />,
      );

      // 1半荘目を編集: Alice 50→30, Bob 10→30, Charlie -60のまま
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "30");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "30");

      await user.click(screen.getByText("保存"));

      // onUpdateScoresが呼ばれ、正しいスコアが渡される
      expect(spy).toHaveBeenCalledTimes(1);
      const [gameIndex, scores] = spy.mock.calls[0];
      expect(gameIndex).toBe(0);
      expect(scores).toEqual(
        expect.arrayContaining([
          { userId: "A", score: 30 },
          { userId: "B", score: 30 },
          { userId: "C", score: -60 },
        ]),
      );

      // 累計: Alice=30+30=60, Bob=30+(-20)=10, Charlie=-60+(-5)=-65, Dave=-5
      let cumulScores = getCumulativeScores();
      expect(cumulScores.some((s) => s.includes("+60"))).toBe(true);
      expect(cumulScores.some((s) => s.includes("+10"))).toBe(true);
      expect(cumulScores.some((s) => s.includes("-65"))).toBe(true);

      // Realtime再fetchをシミュレート → DBに反映済みのため累計が維持される
      await user.click(screen.getByTestId("simulate-refetch"));

      cumulScores = getCumulativeScores();
      expect(cumulScores.some((s) => s.includes("+60"))).toBe(true);
      expect(cumulScores.some((s) => s.includes("+10"))).toBe(true);
      expect(cumulScores.some((s) => s.includes("-65"))).toBe(true);
    });

    it("2半荘目を編集→保存後に再fetchしてもpt換算値が正しい", async () => {
      const user = userEvent.setup();
      render(<WrapperWithDB initialGames={makeTestGames()} ptRate={50} />);

      // 2半荘目を編集: Alice 30→10, Bob -20→-10, Charlie -5→5, Dave -5のまま
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[1]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "10");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "-10");
      await user.clear(inputs[2]);
      await user.type(inputs[2], "5");

      await user.click(screen.getByText("保存"));

      // Realtime再fetchをシミュレート
      await user.click(screen.getByTestId("simulate-refetch"));

      // 累計: Alice=50+10=60, Bob=10+(-10)=0, Charlie=-60+5=-55, Dave=-5
      const scores = getCumulativeScores();
      expect(scores.some((s) => s.includes("+60"))).toBe(true);
      expect(scores.some((s) => s.includes("-55"))).toBe(true);
      // pt換算: Alice=60*50=3,000pt
      expect(scores.some((s) => s.includes("3,000pt"))).toBe(true);
    });

    it("連続編集→各保存後に再fetchしても累計が正しい", async () => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(
        <WrapperWithDB
          initialGames={makeTestGames()}
          ptRate={50}
          onUpdateSpy={spy}
        />,
      );

      // --- 1半荘目を編集 ---
      let editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      let inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "20");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "40");

      await user.click(screen.getByText("保存"));

      // 再fetchシミュレート
      await user.click(screen.getByTestId("simulate-refetch"));

      // --- 2半荘目を編集 ---
      editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[1]);

      inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "-10");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "10");
      await user.clear(inputs[2]);
      await user.type(inputs[2], "5");

      await user.click(screen.getByText("保存"));

      // 再fetchシミュレート
      await user.click(screen.getByTestId("simulate-refetch"));

      // 2回呼ばれている
      expect(spy).toHaveBeenCalledTimes(2);

      // 累計: Alice=20+(-10)=10, Bob=40+10=50, Charlie=-60+5=-55, Dave=-5
      const scores = getCumulativeScores();
      expect(scores.some((s) => s.includes("+10"))).toBe(true);
      expect(scores.some((s) => s.includes("+50"))).toBe(true);
      expect(scores.some((s) => s.includes("-55"))).toBe(true);
      expect(scores.some((s) => s.includes("-5"))).toBe(true);
    });

    it("途中参加者のいない半荘を編集→再fetchでもDaveの累計に影響しない", async () => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(
        <WrapperWithDB
          initialGames={makeTestGames()}
          ptRate={50}
          onUpdateSpy={spy}
        />,
      );

      // 1半荘目を編集（Daveは不参加）
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "60");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "0");

      await user.click(screen.getByText("保存"));

      // onUpdateScoresにDaveが含まれないこと
      const [, updatedScores] = spy.mock.calls[0];
      expect(
        updatedScores.find((s: { userId: string }) => s.userId === "D"),
      ).toBeUndefined();
      expect(updatedScores).toHaveLength(3);

      // 再fetchシミュレート
      await user.click(screen.getByTestId("simulate-refetch"));

      // Alice=60+30=90, Bob=0+(-20)=-20, Charlie=-60+(-5)=-65, Dave=-5
      const scores = getCumulativeScores();
      expect(scores.some((s) => s.includes("+90"))).toBe(true);
      expect(scores.some((s) => s.includes("-20"))).toBe(true);
      expect(scores.some((s) => s.includes("-65"))).toBe(true);
      expect(scores.some((s) => s.includes("-5"))).toBe(true);
    });

    it("編集保存後に半荘行のスコア表示も再fetch後に正しい", async () => {
      const user = userEvent.setup();
      render(<WrapperWithDB initialGames={makeTestGames()} ptRate={50} />);

      // 1半荘目を編集: Alice 50→100, Bob 10→-40, Charlie -60のまま
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "100");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "-40");

      await user.click(screen.getByText("保存"));

      // 再fetchシミュレート
      await user.click(screen.getByTestId("simulate-refetch"));

      // 1半荘目の行のスコアが更新されている
      const cells = getGameRowCells(0);
      expect(cells[1].textContent).toContain("+100");
      expect(cells[2].textContent).toContain("-40");
      expect(cells[3].textContent).toContain("-60");
      expect(cells[4].textContent).toBe("-"); // Daveは不参加

      // 2半荘目は変更なし
      const cells2 = getGameRowCells(1);
      expect(cells2[1].textContent).toContain("+30");
      expect(cells2[2].textContent).toContain("-20");
    });
  });

  describe("DB更新サイレント失敗の検知", () => {
    it("DB更新が失敗した場合、再fetchで編集前のスコアに戻る（= 戦績に未反映）", async () => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(
        <WrapperWithFailingDB
          initialGames={makeTestGames()}
          ptRate={50}
          onUpdateSpy={spy}
        />,
      );

      // 1半荘目を編集: Alice 50→30, Bob 10→30, Charlie -60のまま
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "30");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "30");

      await user.click(screen.getByText("保存"));

      // 楽観的更新で一旦は反映される
      let scores = getCumulativeScores();
      expect(scores.some((s) => s.includes("+60"))).toBe(true); // Alice 30+30

      // Realtime 再fetch → DB は未更新のため旧データに戻る
      await user.click(screen.getByTestId("simulate-refetch"));

      scores = getCumulativeScores();
      // Alice は元の 50+30=+80 に戻っている（= 戦績ページで表示される値）
      expect(scores.some((s) => s.includes("+80"))).toBe(true);
      expect(scores.some((s) => s.includes("+60"))).toBe(false);
    });

    it("DB更新成功時は再fetchしても編集後の値が維持される", async () => {
      const user = userEvent.setup();
      render(<WrapperWithDB initialGames={makeTestGames()} ptRate={50} />);

      // 同じ編集: Alice 50→30, Bob 10→30
      const editButtons = screen.getAllByTitle("編集");
      await user.click(editButtons[0]);

      const inputs = screen.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "30");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "30");

      await user.click(screen.getByText("保存"));

      // 再fetch しても編集後の値が維持される
      await user.click(screen.getByTestId("simulate-refetch"));

      const scores = getCumulativeScores();
      expect(scores.some((s) => s.includes("+60"))).toBe(true); // Alice 30+30
      expect(scores.some((s) => s.includes("+80"))).toBe(false); // 旧値には戻らない
    });
  });
});
