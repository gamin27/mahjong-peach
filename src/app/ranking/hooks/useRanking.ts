import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlayerData } from "@/lib/types/ranking";
import { buildRanking } from "../utils";

export function useRanking() {
  const supabase = createClient();
  const [players3, setPlayers3] = useState<PlayerData[]>([]);
  const [players4, setPlayers4] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const fetchRanking = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .single();
      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setUsername(profile.username);
      }

      // 自分が参加したゲームを取得
      const { data: myScores } = await supabase
        .from("game_scores")
        .select("game_id")
        .eq("user_id", userId);

      if (!myScores || myScores.length === 0) {
        setLoading(false);
        return;
      }

      const myGameIds = [...new Set(myScores.map((s) => s.game_id))];

      // 共有ゲームからco-playerのuser_idを特定
      const { data: sharedScores } = await supabase
        .from("game_scores")
        .select("user_id")
        .in("game_id", myGameIds);

      if (!sharedScores) {
        setLoading(false);
        return;
      }

      const coPlayerIds = [...new Set(sharedScores.map((s) => s.user_id))];

      // co-playerの全スコアを取得（自分が参加していないゲームも含む）
      const { data: allScores } = await supabase
        .from("game_scores")
        .select("game_id, user_id, display_name, avatar_url, score, created_at")
        .in("user_id", coPlayerIds)
        .order("created_at", { ascending: true });

      if (!allScores) {
        setLoading(false);
        return;
      }

      // 全game_idの正確なプレイヤー数を取得 + プロフィール更新
      const allGameIds = [...new Set(allScores.map((s) => s.game_id))];
      const [countRes, profilesRes] = await Promise.all([
        supabase.from("game_scores").select("game_id").in("game_id", allGameIds),
        supabase.from("profiles").select("id, username, avatar_url").in("id", coPlayerIds),
      ]);

      if (profilesRes.data) {
        const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
        for (const p of profilesRes.data) profileMap[p.id] = p;
        for (const s of allScores) {
          const prof = profileMap[s.user_id];
          if (prof) {
            s.display_name = prof.username;
            s.avatar_url = prof.avatar_url;
          }
        }
      }

      // ゲームごとのプレイヤー数を計算
      const gamePlayerCount: Record<string, number> = {};
      if (countRes.data) {
        for (const row of countRes.data) {
          gamePlayerCount[row.game_id] = (gamePlayerCount[row.game_id] || 0) + 1;
        }
      }

      // 3人/4人に分割
      const scores3 = allScores.filter((s) => gamePlayerCount[s.game_id] === 3);
      const scores4 = allScores.filter((s) => gamePlayerCount[s.game_id] === 4);

      const gameOrder3: string[] = [];
      for (const s of scores3) {
        if (!gameOrder3.includes(s.game_id)) gameOrder3.push(s.game_id);
      }
      const gameOrder4: string[] = [];
      for (const s of scores4) {
        if (!gameOrder4.includes(s.game_id)) gameOrder4.push(s.game_id);
      }

      setPlayers3(buildRanking(scores3, gameOrder3));
      setPlayers4(buildRanking(scores4, gameOrder4));
      setLoading(false);
    };

    fetchRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { players3, players4, loading, avatarUrl, username };
}
