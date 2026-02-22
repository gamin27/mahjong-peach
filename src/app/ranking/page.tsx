"use client";

import { useState } from "react";
import Main from "@/components/Main";
import Tabs from "@/components/Tabs";
import FooterNav from "@/components/FooterNav";
import Loading from "@/components/Loading";
import { useRanking } from "./hooks/useRanking";
import { RankingChart } from "./components/RankingChart";
import { RankingList } from "./components/RankingList";
import Card from "@/components/Card";

export default function RankingPage() {
  const { players3, players4, loading, avatarUrl, username } = useRanking();
  const [activeTab, setActiveTab] = useState<3 | 4>(3);

  const has3 = players3.length > 0;
  const has4 = players4.length > 0;
  const tabs: { key: 3 | 4; label: string }[] = [];
  if (has3) tabs.push({ key: 3, label: "3人麻雀" });
  if (has4) tabs.push({ key: 4, label: "4人麻雀" });
  const currentTab = tabs.find((t) => t.key === activeTab)
    ? activeTab
    : tabs[0]?.key;
  const currentPlayers = currentTab === 3 ? players3 : players4;

  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
    >
      <Main>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-1)" }}
        >
          ランキング
        </h1>

        {loading ? (
          <Loading card />
        ) : tabs.length === 0 ? (
          <Card
            shadow={false}
            className="flex flex-col items-center justify-center py-16"
          >
            <p className="text-3xl">👑</p>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-text-3)" }}
            >
              まだ対局記録がありません
            </p>
          </Card>
        ) : (
          <>
            {tabs.length > 1 && (
              <Tabs
                tabs={tabs}
                activeKey={currentTab}
                onChange={setActiveTab}
                contained
              />
            )}

            {tabs.length === 1 && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-3)" }}
              >
                {tabs[0].label}
              </p>
            )}

            <RankingChart players={currentPlayers} />
            <RankingList players={currentPlayers} />
          </>
        )}
      </Main>

      <FooterNav active="ranking" avatarUrl={avatarUrl} username={username} />
    </div>
  );
}
