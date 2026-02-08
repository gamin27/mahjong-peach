"use client";

import { useState } from "react";
import type { RoomMember } from "@/lib/types/room";
import type { YakumanEntry } from "@/lib/types/game";
import Avatar from "@/components/Avatar";

const YAKUMAN_TYPES = [
  "天和",
  "地和",
  "国士無双",
  "四暗刻",
  "大三元",
  "字一色",
  "緑一色",
  "清老頭",
  "九蓮宝燈",
  "四槓子",
  "小四喜",
  "大四喜",
  "国士無双十三面待ち",
  "四暗刻単騎",
  "純正九蓮宝燈",
  "大車輪",
  "大竹林",
  "大数隣",
] as const;

const TILES = {
  萬子: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m"],
  筒子: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"],
  索子: ["1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"],
  字牌: ["東", "南", "西", "北", "白", "発", "中"],
} as const;

const TILE_LABELS: Record<string, string> = {
  "1m": "一萬", "2m": "二萬", "3m": "三萬", "4m": "四萬", "5m": "五萬",
  "6m": "六萬", "7m": "七萬", "8m": "八萬", "9m": "九萬",
  "1p": "一筒", "2p": "二筒", "3p": "三筒", "4p": "四筒", "5p": "五筒",
  "6p": "六筒", "7p": "七筒", "8p": "八筒", "9p": "九筒",
  "1s": "一索", "2s": "二索", "3s": "三索", "4s": "四索", "5s": "五索",
  "6s": "六索", "7s": "七索", "8s": "八索", "9s": "九索",
  "東": "東", "南": "南", "西": "西", "北": "北",
  "白": "白", "発": "発", "中": "中",
};

// 牌の短縮表示（ボタン用）
const TILE_SHORT: Record<string, string> = {
  "1m": "1", "2m": "2", "3m": "3", "4m": "4", "5m": "5",
  "6m": "6", "7m": "7", "8m": "8", "9m": "9",
  "1p": "1", "2p": "2", "3p": "3", "4p": "4", "5p": "5",
  "6p": "6", "7p": "7", "8p": "8", "9p": "9",
  "1s": "1", "2s": "2", "3s": "3", "4s": "4", "5s": "5",
  "6s": "6", "7s": "7", "8s": "8", "9s": "9",
  "東": "東", "南": "南", "西": "西", "北": "北",
  "白": "白", "発": "発", "中": "中",
};

interface YakumanModalProps {
  players: RoomMember[];
  yakumans: YakumanEntry[];
  onAdd: (entry: YakumanEntry) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}

export default function YakumanModal({
  players,
  yakumans,
  onAdd,
  onRemove,
  onClose,
}: YakumanModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [selectedTile, setSelectedTile] = useState("");

  const canAdd = selectedUserId && selectedType && selectedTile;

  const handleAdd = () => {
    if (!canAdd) return;
    const player = players.find((p) => p.user_id === selectedUserId);
    if (!player) return;

    onAdd({
      userId: player.user_id,
      displayName: player.display_name,
      avatarUrl: player.avatar_url,
      yakumanType: selectedType,
      winningTile: selectedTile,
    });

    // リセット
    setSelectedUserId(null);
    setSelectedType("");
    setSelectedTile("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "0 16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-bg-1)",
          borderRadius: "12px",
          padding: "20px",
          maxWidth: "420px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "var(--shadow-popup)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-1)", marginBottom: "16px" }}
        >
          役満を記録
        </p>

        {/* 誰が */}
        <div style={{ marginBottom: "16px" }}>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--color-text-3)", marginBottom: "8px" }}
          >
            上がった人
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {players.map((p) => (
              <button
                key={p.user_id}
                onClick={() => setSelectedUserId(p.user_id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                  border: `2px solid ${selectedUserId === p.user_id ? "var(--arcoblue-6)" : "var(--color-border)"}`,
                  background: selectedUserId === p.user_id ? "var(--arcoblue-1)" : "var(--color-bg-2)",
                  cursor: "pointer",
                  minWidth: "60px",
                }}
              >
                <Avatar src={p.avatar_url} name={p.display_name} size={32} />
                <span
                  className="text-xs"
                  style={{
                    color: selectedUserId === p.user_id ? "var(--arcoblue-6)" : "var(--color-text-2)",
                    maxWidth: "56px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.display_name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 役満の種類 */}
        <div style={{ marginBottom: "16px" }}>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--color-text-3)", marginBottom: "8px" }}
          >
            役満の種類
          </p>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "16px",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-2)",
              color: selectedType ? "var(--color-text-1)" : "var(--color-text-3)",
              outline: "none",
              appearance: "auto",
            }}
          >
            <option value="">選択してください</option>
            {YAKUMAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* 上がり牌 */}
        <div style={{ marginBottom: "16px" }}>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--color-text-3)", marginBottom: "8px" }}
          >
            上がり牌
          </p>
          {Object.entries(TILES).map(([group, tiles]) => (
            <div key={group} style={{ marginBottom: "8px" }}>
              <p
                className="text-xs"
                style={{ color: "var(--color-text-3)", marginBottom: "4px" }}
              >
                {group}
              </p>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {tiles.map((tile) => (
                  <button
                    key={tile}
                    onClick={() => setSelectedTile(tile)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      border: `1.5px solid ${selectedTile === tile ? "var(--arcoblue-6)" : "var(--color-border)"}`,
                      background: selectedTile === tile ? "var(--arcoblue-1)" : "var(--color-bg-2)",
                      color: selectedTile === tile ? "var(--arcoblue-6)" : "var(--color-text-1)",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {TILE_SHORT[tile]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 追加ボタン */}
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            fontWeight: 500,
            borderRadius: "8px",
            border: "none",
            background: "var(--arcoblue-6)",
            color: "#fff",
            cursor: canAdd ? "pointer" : "not-allowed",
            opacity: canAdd ? 1 : 0.4,
            marginBottom: "16px",
          }}
        >
          追加
        </button>

        {/* 追加済みリスト */}
        {yakumans.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--color-text-3)", marginBottom: "8px" }}
            >
              記録済み
            </p>
            <div className="flex flex-col gap-2">
              {yakumans.map((y, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg p-3"
                  style={{
                    background: "var(--color-bg-2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Avatar src={y.avatarUrl} name={y.displayName} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium" style={{ color: "var(--color-text-1)" }}>
                      {y.displayName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
                      {y.yakumanType} / {TILE_LABELS[y.winningTile] || y.winningTile}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(i)}
                    style={{
                      fontSize: "16px",
                      color: "var(--color-text-3)",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 完了 */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            fontWeight: 500,
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-1)",
            color: "var(--color-text-2)",
            cursor: "pointer",
          }}
        >
          完了
        </button>
      </div>
    </div>
  );
}

export { TILE_LABELS };
