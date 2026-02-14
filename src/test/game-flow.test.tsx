import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RoomMember } from "@/lib/types/room";
import type { CompletedGame, YakumanEntry } from "@/lib/types/game";
import PlayerSelection from "@/components/PlayerSelection";
import ScoreEntry from "@/components/ScoreEntry/ScoreEntry";
import GameScoreTable from "@/components/GameScoreTable";

// --- ヘルパー ---
const makeMember = (
  id: string,
  name: string,
  userId: string,
  roomId = "room-1",
): RoomMember => ({
  id,
  room_id: roomId,
  user_id: userId,
  display_name: name,
  avatar_url: null,
  joined_at: new Date().toISOString(),
});

const HOST_ID = "user-host";
const members4: RoomMember[] = [
  makeMember("m1", "太郎", HOST_ID),
  makeMember("m2", "花子", "user-b"),
  makeMember("m3", "次郎", "user-c"),
  makeMember("m4", "三郎", "user-d"),
  makeMember("m5", "四郎", "user-e"),
];

const members3: RoomMember[] = [
  makeMember("m1", "太郎", HOST_ID),
  makeMember("m2", "花子", "user-b"),
  makeMember("m3", "次郎", "user-c"),
  makeMember("m4", "三郎", "user-d"),
];

// === PlayerSelection テスト ===
describe("PlayerSelection", () => {
  it("対局者と控えが正しく表示される", () => {
    const playerIds = new Set([HOST_ID, "user-b", "user-c", "user-d"]);
    render(
      <PlayerSelection
        members={members4}
        playerIds={playerIds}
        currentUserId={HOST_ID}
        createdBy={HOST_ID}
      />,
    );

    // 4人が対局、1人が控え
    expect(screen.getAllByText(/対局/)).toHaveLength(4);
    expect(screen.getAllByText(/控え/)).toHaveLength(1);
  });

  it("控えの参加者は opacity が低くなる", () => {
    const playerIds = new Set([HOST_ID, "user-b", "user-c", "user-d"]);
    const { container } = render(
      <PlayerSelection
        members={members4}
        playerIds={playerIds}
        currentUserId={HOST_ID}
        createdBy={HOST_ID}
      />,
    );

    // 控えEの行を取得
    const cards = container.querySelectorAll("[data-testid]");
    const substituteCard = container.querySelector(
      '[data-testid="member-user-e"]',
    );
    expect(substituteCard).not.toBeNull();
    expect(substituteCard!.getAttribute("style")).toContain("opacity");
  });

  it("ホストがタップして対局↔控えを切り替えできる", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const playerIds = new Set([HOST_ID, "user-b", "user-c", "user-d"]);

    render(
      <PlayerSelection
        members={members4}
        playerIds={playerIds}
        onToggle={onToggle}
        currentUserId={HOST_ID}
        createdBy={HOST_ID}
      />,
    );

    // 控えEをクリック
    const substituteCard = screen.getByTestId("member-user-e");
    await user.click(substituteCard);
    expect(onToggle).toHaveBeenCalledWith(members4[4]);
  });
});

// === ScoreEntry テスト ===
describe("ScoreEntry", () => {
  it("3人分入力すると最後の1人が自動計算される（4人麻雀）", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const players = members4.slice(0, 4); // 4人対局

    render(
      <ScoreEntry players={players} playerCount={4} onConfirm={onConfirm} />,
    );

    const inputs = screen.getAllByPlaceholderText("点数");
    expect(inputs).toHaveLength(4);

    // 3人分入力（合計 +30 なので最後は -30 に自動計算される）
    await user.type(inputs[0], "30");
    await user.type(inputs[1], "10");
    await user.type(inputs[2], "-10");

    // 自動計算値が表示されているはず（-30）
    expect(screen.getByText("-30")).toBeInTheDocument();

    // 確定ボタンをクリック
    const confirmBtn = screen.getByRole("button", { name: "確定" });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [scores] = onConfirm.mock.calls[0];
    expect(scores).toHaveLength(4);

    // スコア合計が0であることを確認
    const total = scores.reduce(
      (sum: number, s: { score: number }) => sum + s.score,
      0,
    );
    expect(total).toBe(0);

    // 各スコアが正しい
    expect(scores[0].score).toBe(30);
    expect(scores[1].score).toBe(10);
    expect(scores[2].score).toBe(-10);
    expect(scores[3].score).toBe(-30);
  });

  it("2人分入力すると最後の1人が自動計算される（3人麻雀）", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const players = members3.slice(0, 3);

    render(
      <ScoreEntry players={players} playerCount={3} onConfirm={onConfirm} />,
    );

    const inputs = screen.getAllByPlaceholderText("点数");
    expect(inputs).toHaveLength(3);

    await user.type(inputs[0], "50");
    await user.type(inputs[1], "-20");

    // 自動計算値（-30）
    expect(screen.getByText("-30")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "確定" });
    await user.click(confirmBtn);

    const [scores] = onConfirm.mock.calls[0];
    expect(scores).toHaveLength(3);
    const total = scores.reduce(
      (sum: number, s: { score: number }) => sum + s.score,
      0,
    );
    expect(total).toBe(0);
  });

  it("全員分入力していない場合は確定ボタンが無効", () => {
    const onConfirm = vi.fn();
    const players = members4.slice(0, 4);

    render(
      <ScoreEntry players={players} playerCount={4} onConfirm={onConfirm} />,
    );

    const confirmBtn = screen.getByRole("button", { name: "確定" });
    expect(confirmBtn).toBeDisabled();
  });
});

// === GameScoreTable テスト（累計スコア） ===
describe("GameScoreTable - 複数半荘の累計", () => {
  it("半荘ごとのスコアと累計が正しく計算される", () => {
    const games: CompletedGame[] = [
      {
        game: {
          id: "g1",
          room_id: "room-1",
          round_number: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
        scores: [
          {
            id: "s1",
            game_id: "g1",
            user_id: HOST_ID,
            display_name: "ホスト",
            avatar_url: null,
            score: 30,
          },
          {
            id: "s2",
            game_id: "g1",
            user_id: "user-b",
            display_name: "B",
            avatar_url: null,
            score: 10,
          },
          {
            id: "s3",
            game_id: "g1",
            user_id: "user-c",
            display_name: "C",
            avatar_url: null,
            score: -10,
          },
          {
            id: "s4",
            game_id: "g1",
            user_id: "user-d",
            display_name: "D",
            avatar_url: null,
            score: -30,
          },
        ],
        yakumans: [],
      },
      {
        game: {
          id: "g2",
          room_id: "room-1",
          round_number: 2,
          created_at: "2025-01-01T01:00:00Z",
        },
        scores: [
          {
            id: "s5",
            game_id: "g2",
            user_id: HOST_ID,
            display_name: "ホスト",
            avatar_url: null,
            score: -20,
          },
          {
            id: "s6",
            game_id: "g2",
            user_id: "user-b",
            display_name: "B",
            avatar_url: null,
            score: 40,
          },
          {
            id: "s7",
            game_id: "g2",
            user_id: "user-c",
            display_name: "C",
            avatar_url: null,
            score: -5,
          },
          {
            id: "s8",
            game_id: "g2",
            user_id: "user-d",
            display_name: "D",
            avatar_url: null,
            score: -15,
          },
        ],
        yakumans: [],
      },
    ];

    const { container } = render(<GameScoreTable games={games} ptRate={50} />);
    const table = container.querySelector("table")!;

    // テーブルが存在する
    expect(table).not.toBeNull();

    // 「累計」行がある
    expect(screen.getByText("累計")).toBeInTheDocument();

    // 「1半荘」「2半荘」行がある
    expect(screen.getByText("1半荘")).toBeInTheDocument();
    expect(screen.getByText("2半荘")).toBeInTheDocument();

    // 累計スコアの検証
    // ホスト: 30 + (-20) = 10
    // B: 10 + 40 = 50
    // C: -10 + (-5) = -15
    // D: -30 + (-15) = -45
    // 合計: 10 + 50 - 15 - 45 = 0 ✓

    // 各半荘のスコアが存在するか確認（テーブル内テキスト）
    const cellTexts = Array.from(table.querySelectorAll("td")).map(
      (td) => td.textContent,
    );

    // 半荘1のスコアが含まれている
    expect(cellTexts.some((t) => t?.includes("+30"))).toBe(true);
    expect(cellTexts.some((t) => t?.includes("+10"))).toBe(true);
    expect(cellTexts.some((t) => t?.includes("-10"))).toBe(true);
    expect(cellTexts.some((t) => t?.includes("-30"))).toBe(true);

    // 半荘2のスコアが含まれている
    expect(cellTexts.some((t) => t?.includes("-20"))).toBe(true);
    expect(cellTexts.some((t) => t?.includes("+40"))).toBe(true);
  });

  it("ptRate が渡されると累計にpt表示がある", () => {
    const games: CompletedGame[] = [
      {
        game: {
          id: "g1",
          room_id: "room-1",
          round_number: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
        scores: [
          {
            id: "s1",
            game_id: "g1",
            user_id: HOST_ID,
            display_name: "ホスト",
            avatar_url: null,
            score: 30,
          },
          {
            id: "s2",
            game_id: "g1",
            user_id: "user-b",
            display_name: "B",
            avatar_url: null,
            score: -30,
          },
        ],
        yakumans: [],
      },
    ];

    render(<GameScoreTable games={games} ptRate={50} />);

    // pt表示がある
    expect(screen.getByText("(+1,500pt)")).toBeInTheDocument();
    expect(screen.getByText("(-1,500pt)")).toBeInTheDocument();
  });
});

// === 一連のゲームフロー統合テスト ===
describe("ゲームフロー統合テスト", () => {
  it("4人麻雀: 対局者選択 → 点数入力 → 控え切替 → 再度入力 → 累計検証", async () => {
    const user = userEvent.setup();
    const completedGames: CompletedGame[] = [];

    // --- 第1半荘: 対局者選択 ---
    const playerIds1 = new Set([HOST_ID, "user-b", "user-c", "user-d"]);
    const { unmount: unmountSelection1 } = render(
      <PlayerSelection
        members={members4}
        playerIds={playerIds1}
        currentUserId={HOST_ID}
        createdBy={HOST_ID}
      />,
    );

    expect(screen.getAllByText(/対局/)).toHaveLength(4);
    expect(screen.getAllByText(/控え/)).toHaveLength(1);
    unmountSelection1();

    // --- 第1半荘: 点数入力 ---
    const players1 = members4.filter((m) => playerIds1.has(m.user_id));
    const onConfirm1 = vi.fn();
    const { unmount: unmountScore1 } = render(
      <ScoreEntry players={players1} playerCount={4} onConfirm={onConfirm1} />,
    );

    const inputs1 = screen.getAllByPlaceholderText("点数");
    await user.type(inputs1[0], "40");
    await user.type(inputs1[1], "10");
    await user.type(inputs1[2], "-20");
    // user-d は自動: -(40+10-20) = -30

    await user.click(screen.getByRole("button", { name: "確定" }));
    expect(onConfirm1).toHaveBeenCalledTimes(1);

    const scores1 = onConfirm1.mock.calls[0][0] as {
      userId: string;
      displayName: string;
      score: number;
    }[];
    expect(scores1.reduce((s, v) => s + v.score, 0)).toBe(0);

    // completedGames に追加
    completedGames.push({
      game: {
        id: "g1",
        room_id: "room-1",
        round_number: 1,
        created_at: "2025-01-01T00:00:00Z",
      },
      scores: scores1.map((s, i) => ({
        id: `s1-${i}`,
        game_id: "g1",
        user_id: s.userId,
        display_name: s.displayName,
        avatar_url: null,
        score: s.score,
      })),
      yakumans: [],
    });
    unmountScore1();

    // --- 第2半荘: 控えと切り替え（user-d → 控え、user-e → 対局） ---
    const playerIds2 = new Set([HOST_ID, "user-b", "user-c", "user-e"]);
    const { unmount: unmountSelection2 } = render(
      <PlayerSelection
        members={members4}
        playerIds={playerIds2}
        currentUserId={HOST_ID}
        createdBy={HOST_ID}
      />,
    );

    // 確認: user-e が対局、user-d が控え
    const eCard = screen.getByTestId("member-user-e");
    expect(within(eCard).getByText(/対局/)).toBeInTheDocument();
    const dCard = screen.getByTestId("member-user-d");
    expect(within(dCard).getByText(/控え/)).toBeInTheDocument();
    unmountSelection2();

    // --- 第2半荘: 点数入力 ---
    const players2 = members4.filter((m) => playerIds2.has(m.user_id));
    const onConfirm2 = vi.fn();
    const { unmount: unmountScore2 } = render(
      <ScoreEntry players={players2} playerCount={4} onConfirm={onConfirm2} />,
    );

    const inputs2 = screen.getAllByPlaceholderText("点数");
    await user.type(inputs2[0], "-10");
    await user.type(inputs2[1], "20");
    await user.type(inputs2[2], "30");
    // user-e は自動: -((-10)+20+30) = -40

    await user.click(screen.getByRole("button", { name: "確定" }));
    expect(onConfirm2).toHaveBeenCalledTimes(1);

    const scores2 = onConfirm2.mock.calls[0][0] as {
      userId: string;
      displayName: string;
      score: number;
    }[];
    expect(scores2.reduce((s, v) => s + v.score, 0)).toBe(0);

    completedGames.push({
      game: {
        id: "g2",
        room_id: "room-1",
        round_number: 2,
        created_at: "2025-01-01T01:00:00Z",
      },
      scores: scores2.map((s, i) => ({
        id: `s2-${i}`,
        game_id: "g2",
        user_id: s.userId,
        display_name: s.displayName,
        avatar_url: null,
        score: s.score,
      })),
      yakumans: [],
    });
    unmountScore2();

    // --- 結果テーブルで累計を検証 ---
    const { container } = render(
      <GameScoreTable games={completedGames} ptRate={50} />,
    );

    const table = container.querySelector("table")!;
    expect(table).not.toBeNull();
    expect(screen.getByText("1半荘")).toBeInTheDocument();
    expect(screen.getByText("2半荘")).toBeInTheDocument();

    // 累計スコア:
    // ホスト: 40 + (-10) = 30
    // B: 10 + 20 = 30
    // C: -20 + 30 = 10
    // D: -30 (第1半荘のみ)
    // E: -40 (第2半荘のみ)
    // 合計: 30+30+10-30-40 = 0 ✓

    const cellTexts = Array.from(table.querySelectorAll("td")).map(
      (td) => td.textContent,
    );
    // 累計の pt 表示が含まれている
    expect(cellTexts.some((t) => t?.includes("pt"))).toBe(true);
  });

  it("3人麻雀: 控えなしで2半荘を繰り返し累計が正しい", async () => {
    const user = userEvent.setup();
    const completedGames: CompletedGame[] = [];
    const players = members3.slice(0, 3); // 控えなし

    // --- 第1半荘 ---
    const onConfirm1 = vi.fn();
    const { unmount: unmount1 } = render(
      <ScoreEntry players={players} playerCount={3} onConfirm={onConfirm1} />,
    );

    const inputs1 = screen.getAllByPlaceholderText("点数");
    await user.type(inputs1[0], "25");
    await user.type(inputs1[1], "-10");

    await user.click(screen.getByRole("button", { name: "確定" }));
    const scores1 = onConfirm1.mock.calls[0][0] as {
      userId: string;
      displayName: string;
      score: number;
    }[];
    expect(scores1[2].score).toBe(-15); // 自動計算: -(25-10)=-15
    expect(scores1.reduce((s, v) => s + v.score, 0)).toBe(0);

    completedGames.push({
      game: {
        id: "g1",
        room_id: "room-1",
        round_number: 1,
        created_at: "2025-01-01T00:00:00Z",
      },
      scores: scores1.map((s, i) => ({
        id: `s1-${i}`,
        game_id: "g1",
        user_id: s.userId,
        display_name: s.displayName,
        avatar_url: null,
        score: s.score,
      })),
      yakumans: [],
    });
    unmount1();

    // --- 第2半荘 ---
    const onConfirm2 = vi.fn();
    const { unmount: unmount2 } = render(
      <ScoreEntry players={players} playerCount={3} onConfirm={onConfirm2} />,
    );

    const inputs2 = screen.getAllByPlaceholderText("点数");
    await user.type(inputs2[0], "-30");
    await user.type(inputs2[1], "50");

    await user.click(screen.getByRole("button", { name: "確定" }));
    const scores2 = onConfirm2.mock.calls[0][0] as {
      userId: string;
      displayName: string;
      score: number;
    }[];
    expect(scores2[2].score).toBe(-20); // 自動計算: -((-30)+50)=-20
    expect(scores2.reduce((s, v) => s + v.score, 0)).toBe(0);

    completedGames.push({
      game: {
        id: "g2",
        room_id: "room-1",
        round_number: 2,
        created_at: "2025-01-01T01:00:00Z",
      },
      scores: scores2.map((s, i) => ({
        id: `s2-${i}`,
        game_id: "g2",
        user_id: s.userId,
        display_name: s.displayName,
        avatar_url: null,
        score: s.score,
      })),
      yakumans: [],
    });
    unmount2();

    // --- 累計検証 ---
    // ホスト: 25 + (-30) = -5
    // B: -10 + 50 = 40
    // C: -15 + (-20) = -35
    // 合計: -5 + 40 - 35 = 0 ✓
    render(<GameScoreTable games={completedGames} />);
    expect(screen.getByText("1半荘")).toBeInTheDocument();
    expect(screen.getByText("2半荘")).toBeInTheDocument();
  });
});
