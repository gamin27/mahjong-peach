import { useState, useEffect } from "react";
import type { HistoryData } from "./useHistoryData";
import type { HistoryUI } from "./useHistoryUI";

type SubTab = "summary" | "games" | "achievements";

export function useHistoryTabs(data: HistoryData, ui: HistoryUI) {
  const [activeTab, setActiveTab] = useState<3 | 4>(3);
  const [subTab, setSubTab] = useState<SubTab>("summary");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // initResult を消費して初期タブ・年を設定
  useEffect(() => {
    if (!data.initResult) return;
    setAvailableYears(data.initResult.years);
    setSelectedYear(data.initResult.initialYear);
    setActiveTab(data.initResult.initialTab);
  }, [data.initResult]);

  const getEffectiveTab = (desired: 3 | 4, year: number): 3 | 4 => {
    const meta = data.metaRef.current;
    if (!meta) return desired;
    const hasDesired = meta.gamesData.some(
      (g) =>
        new Date(g.created_at).getFullYear() === year &&
        meta.gamePlayerCount[g.id] === desired,
    );
    if (hasDesired) return desired;
    const other: 3 | 4 = desired === 3 ? 4 : 3;
    const hasOther = meta.gamesData.some(
      (g) =>
        new Date(g.created_at).getFullYear() === year &&
        meta.gamePlayerCount[g.id] === other,
    );
    return hasOther ? other : desired;
  };

  const fetchForTab = async (year: number, tab: SubTab, pc: 3 | 4) => {
    const key = `${tab}:${year}:${pc}`;
    if (data.fetchedRef.current.has(key)) return;
    if (tab === "summary") await data.fetchSummary(year, pc);
    else if (tab === "games") await data.fetchGames(year, pc);
    else if (tab === "achievements") await data.fetchAchievements(year, pc);
  };

  const handleYearChange = async (year: number) => {
    if (year === selectedYear) return;
    setSelectedYear(year);
    const pc = getEffectiveTab(activeTab, year);
    setActiveTab(pc);
    await fetchForTab(year, subTab, pc);
  };

  const handleSubTabChange = async (newSubTab: SubTab) => {
    setSubTab(newSubTab);
    await fetchForTab(selectedYear, newSubTab, activeTab);
  };

  const handleActiveTabChange = async (pc: 3 | 4) => {
    setActiveTab(pc);
    await fetchForTab(selectedYear, subTab, pc);
  };

  const handleLoadMore = async (playerCount: 3 | 4) => {
    ui.setTabLoading(true);
    await data.loadMoreGames(selectedYear, playerCount);
    ui.setTabLoading(false);
  };

  // ---- 導出値 ----

  const has3 = data.metaRef.current
    ? data.metaRef.current.gamesData.some(
        (g) =>
          new Date(g.created_at).getFullYear() === selectedYear &&
          data.metaRef.current!.gamePlayerCount[g.id] === 3,
      )
    : false;
  const has4 = data.metaRef.current
    ? data.metaRef.current.gamesData.some(
        (g) =>
          new Date(g.created_at).getFullYear() === selectedYear &&
          data.metaRef.current!.gamePlayerCount[g.id] === 4,
      )
    : false;

  const tabs: { key: 3 | 4; label: string }[] = [];
  if (has3) tabs.push({ key: 3, label: "3人麻雀" });
  if (has4) tabs.push({ key: 4, label: "4人麻雀" });

  const currentTab = tabs.find((t) => t.key === activeTab)
    ? activeTab
    : tabs[0]?.key;

  const currentPlayers = currentTab === 3 ? data.players3 : data.players4;
  const currentYakumans = currentTab === 3 ? data.yakumans3 : data.yakumans4;
  const currentSessions = currentTab === 3 ? data.sessions3 : data.sessions4;
  const currentAchievements =
    currentTab === 3 ? data.achievements3 : data.achievements4;
  const lastLabel = currentTab === 3 ? "3位率" : "4位率";

  const gamesRemaining = (() => {
    const key = `${selectedYear}:${currentTab}`;
    const gm = data.gamesMetaRef.current[key];
    if (!gm) return 0;
    return Math.max(0, gm.rooms.length - gm.loaded);
  })();

  return {
    activeTab,
    subTab,
    selectedYear,
    availableYears,
    handleYearChange,
    handleSubTabChange,
    handleActiveTabChange,
    handleLoadMore,
    has3,
    has4,
    tabs,
    currentTab,
    currentPlayers,
    currentYakumans,
    currentSessions,
    currentAchievements,
    lastLabel,
    gamesRemaining,
  };
}
