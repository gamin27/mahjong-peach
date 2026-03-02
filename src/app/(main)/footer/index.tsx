"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import DropdownMenu from "@/components/DropdownMenu";
import Icon from "@mdi/react";
import { mdiHome, mdiHistory, mdiTrophy } from "@mdi/js";

const NAV_ITEMS = [
  { key: "home", icon: mdiHome, path: "/" },
  { key: "ranking", icon: mdiTrophy, path: "/ranking" },
  { key: "history", icon: mdiHistory, path: "/history" },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

function getActiveKey(pathname: string): NavKey {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/ranking")) return "ranking";
  return "home";
}

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");

  const active = getActiveKey(pathname);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setUsername(data.username ?? "");
        setAvatarUrl(data.avatar_url ?? null);
      }
    };
    fetchProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <>
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "56px",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "var(--color-bg-1)",
          borderTop: "1px solid var(--color-border)",
          zIndex: 10,
        }}
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={
              item.key !== active ? () => router.push(item.path) : undefined
            }
          >
            <Icon
              path={item.icon}
              size={1}
              color={
                item.key === active
                  ? "var(--arcoblue-6)"
                  : "var(--color-text-3)"
              }
            />
          </button>
        ))}
        <DropdownMenu
          trigger={<Avatar src={avatarUrl} name={username || "?"} size={28} />}
          placement="top-right"
          items={[
            {
              label: "アカウント編集",
              onClick: () => router.push("/account/edit"),
              separator: true,
            },
            {
              label: "ログアウト",
              onClick: handleLogout,
              color: "var(--red-6)",
            },
          ]}
        />
      </nav>
      <div style={{ height: "70px" }} />
    </>
  );
}
