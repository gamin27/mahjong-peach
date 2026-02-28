"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import DropdownMenu from "@/components/DropdownMenu";

const NAV_ITEMS = [
  { key: "home", icon: "🀄", path: "/" },
  { key: "history", icon: "🗒️", path: "/history" },
  { key: "ranking", icon: "👑", path: "/ranking" },
] as const;

type ActivePage = (typeof NAV_ITEMS)[number]["key"];

interface FooterNavProps {
  active: ActivePage;
  avatarUrl: string | null;
  username: string;
}

export default function FooterNav({
  active,
  avatarUrl,
  username,
}: FooterNavProps) {
  const router = useRouter();
  const supabase = createClient();

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
