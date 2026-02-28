import { useState } from "react";

export function useHistoryUI() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  return {
    avatarUrl,
    setAvatarUrl,
    username,
    setUsername,
    isAdmin,
    setIsAdmin,
    loading,
    setLoading,
    tabLoading,
    setTabLoading,
  };
}

export type HistoryUI = ReturnType<typeof useHistoryUI>;
