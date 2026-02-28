"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import DropdownMenu from "@/components/DropdownMenu";

const NAV_ITEMS = [
  { key: "home", icon: "🀄", path: "/" },
  { key: "history", icon: "🗒️", path: "/history" },
  { key: "ranking", icon: "👑", path: "/ranking" },
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
  const supabase = createClient();
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
  }, []);

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
            style={{
              fontSize: "24px",
              lineHeight: 1,
              opacity: item.key === active ? 1 : undefined,
            }}
          >
            {item.icon}
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
