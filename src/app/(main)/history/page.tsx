"use client";

import Avatar from "@/components/Avatar";
import Main from "@/components/Main";
import Field from "@/components/Field";
import GameScoreTable from "@/components/GameScoreTable";
import Button from "@/components/Button";
import Tabs from "@/components/Tabs";
import Loading from "@/components/Loading";
import { TILE_LABELS } from "@/components/YakumanModal";
import AchievementBadges from "@/components/AchievementBadges";
import { useHistoryUI } from "./hooks/useHistoryUI";
import { useHistoryData } from "./hooks/useHistoryData";
import { useHistoryTabs } from "./hooks/useHistoryTabs";
import Card from "@/components/Card";

export default function HistoryPage() {
  const ui = useHistoryUI();
  const data = useHistoryData(ui);
  const tabs = useHistoryTabs(data, ui);

  if (ui.loading) {
    return (
      <div
        className="flex flex-col"
        style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
      >
        <Main>
          <Loading />
        </Main>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
    >
      <Main>
        <div className="flex items-center justify-between">
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-1)" }}
          >
            対戦記録
          </h1>
          {tabs.availableYears.length > 0 && (
            <select
              value={tabs.selectedYear}
              onChange={(e) => tabs.handleYearChange(Number(e.target.value))}
              style={{
                padding: "4px 24px 4px 8px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-1)",
                color: "var(--color-text-1)",
                cursor: "pointer",
              }}
            >
              {tabs.availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          )}
        </div>

        {tabs.tabs.length === 0 ? (
          <Card
            shadow={false}
            className="flex flex-col items-center justify-center py-16"
          >
            <p className="text-3xl">🗒️</p>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-text-3)" }}
            >
              まだ対局記録がありません
            </p>
          </Card>
        ) : (
          <>
            {/* 3人/4人タブ */}
            {tabs.tabs.length > 1 && (
              <Tabs
                tabs={tabs.tabs}
                activeKey={tabs.currentTab}
                onChange={tabs.handleActiveTabChange}
                contained
              />
            )}

            {tabs.tabs.length === 1 && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-3)" }}
              >
                {tabs.tabs[0].label}
              </p>
            )}

            {/* サマリー/戦績/実績 サブタブ */}
            <Tabs
              tabs={[
                { key: "summary" as const, label: "サマリー" },
                { key: "games" as const, label: "戦績" },
                { key: "achievements" as const, label: "実績" },
              ]}
              activeKey={tabs.subTab}
              onChange={tabs.handleSubTabChange}
              variant="pill"
            />

            {/* サマリータブ */}
            {tabs.subTab === "summary" && (
              <>
                {ui.tabLoading && tabs.currentPlayers.length === 0 ? (
                  <Loading />
                ) : (
                  <>
                    {/* プレイヤー一覧 */}
                    <div className="flex flex-col gap-3">
                      {tabs.currentPlayers.map((p) => (
                        <Card key={p.userId} className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={p.avatarUrl}
                              name={p.displayName}
                              size={36}
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-sm font-medium"
                                style={{ color: "var(--color-text-1)" }}
                              >
                                {p.displayName}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "var(--color-text-3)" }}
                              >
                                {p.totalGames}戦
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            <Field
                              variant="small"
                              label="1位率"
                              value={`${p.topRate.toFixed(0)}%`}
                              valueColor="var(--red-6)"
                            />
                            <Field
                              variant="small"
                              label={tabs.lastLabel}
                              value={`${p.lastRate.toFixed(0)}%`}
                            />
                            <Field
                              variant="small"
                              label="平均順位"
                              value={`${p.avgRank.toFixed(1)}位`}
                            />
                            <Field
                              variant="small"
                              label="飛び率"
                              value={`${p.tobiRate.toFixed(0)}%`}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* 役満上がり一覧 */}
                    {tabs.currentYakumans.length > 0 && (
                      <div>
                        <p
                          className="mb-3 text-sm font-semibold"
                          style={{ color: "var(--color-text-1)" }}
                        >
                          役満一覧
                        </p>
                        <Card shadow={false}>
                          {tabs.currentYakumans.map((y, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-4 py-3"
                              style={{
                                borderBottom:
                                  i < tabs.currentYakumans.length - 1
                                    ? "1px solid var(--color-border)"
                                    : "none",
                              }}
                            >
                              <Avatar
                                src={y.avatarUrl}
                                name={y.displayName}
                                size={32}
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: "var(--color-text-1)" }}
                                >
                                  {y.displayName} — {y.yakumanType}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{ color: "var(--color-text-3)" }}
                                >
                                  {y.winningTile
                                    ? `${TILE_LABELS[y.winningTile] || y.winningTile} ・ `
                                    : ""}
                                  {new Date(y.date).toLocaleDateString(
                                    "ja-JP",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </Card>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* 戦績タブ */}
            {tabs.subTab === "games" && (
              <>
                {ui.tabLoading && tabs.currentSessions.length === 0 ? (
                  <Loading />
                ) : tabs.currentSessions.length === 0 ? (
                  <Card
                    shadow={false}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-3)" }}
                    >
                      まだ戦績がありません
                    </p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {tabs.currentSessions.map((session) => (
                      <div key={session.roomId}>
                        <p
                          className="mb-2 text-xs font-medium"
                          style={{ color: "var(--color-text-3)" }}
                        >
                          {new Date(session.date).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          ・{session.games.length}半荘
                        </p>
                        <GameScoreTable
                          games={session.games}
                          maxHeight="none"
                          ptRate={session.ptRate}
                          showLabel={false}
                          onUpdateScores={
                            ui.isAdmin
                              ? (gameIndex, scores) =>
                                  data.handleUpdateScores(
                                    tabs.currentTab as 3 | 4,
                                    session.roomId,
                                    gameIndex,
                                    scores
                                  )
                              : undefined
                          }
                        />
                      </div>
                    ))}
                    {tabs.gamesRemaining > 0 && (
                      <Button
                        variant="tertiary"
                        onClick={() =>
                          tabs.handleLoadMore(tabs.currentTab as 3 | 4)
                        }
                        disabled={ui.tabLoading}
                      >
                        {ui.tabLoading
                          ? "読み込み中..."
                          : `もっと見る（残り${tabs.gamesRemaining}件）`}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 実績タブ */}
            {tabs.subTab === "achievements" && (
              <>
                {ui.tabLoading && tabs.currentAchievements.length === 0 ? (
                  <Loading />
                ) : tabs.currentAchievements.length === 0 ? (
                  <Card
                    shadow={false}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-3)" }}
                    >
                      まだ実績はありません
                    </p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {tabs.currentAchievements.map((a) => (
                      <Card key={a.userId} className="p-4">
                        <div className="mb-3 flex items-center gap-3">
                          <Avatar
                            src={a.avatarUrl}
                            name={a.displayName}
                            size={36}
                          />
                          <p
                            className="truncate text-sm font-medium"
                            style={{ color: "var(--color-text-1)" }}
                          >
                            {a.displayName}
                          </p>
                        </div>
                        <AchievementBadges data={a} />
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Main>
    </div>
  );
}
