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
  const activeIndex = NAV_ITEMS.findIndex((item) => item.key === active);
  const [targetIndex, setTargetIndex] = useState(activeIndex);
  const [morphState, setMorphState] = useState<"bounce" | "rest">("rest");

  const handleNavClick = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.key === active) return;
    setTargetIndex(NAV_ITEMS.findIndex((i) => i.key === item.key));
    setMorphState("bounce");
    setTimeout(() => setMorphState("rest"), 120);
    router.push(item.path);
  };

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
          alignItems: "center",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "var(--color-bg-1)",
          borderTop: "1px solid var(--color-border)",
          zIndex: 10,
        }}
      >
        {/* スライドピル */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "28px",
            left: `calc(${targetIndex * 25 + 12.5}% - 20px)`,
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "var(--arcoblue-1)",
            transform: `translateY(-50%) scaleX(${morphState === "bounce" ? 0.72 : 1}) scaleY(${morphState === "bounce" ? 1.35 : 1})`,
            transition:
              morphState === "bounce"
                ? "transform 0.1s ease-out"
                : "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: 0,
          }}
        />

        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item)}
            style={{
              flex: 1,
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              height: "56px",
            }}
          >
            <span
              style={{
                display: "flex",
                color:
                  item.key === active
                    ? "var(--arcoblue-6)"
                    : "var(--color-text-3)",
                transition: "color 0.25s ease",
              }}
            >
              <Icon path={item.icon} size={1} />
            </span>
          </button>
        ))}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "56px",
          }}
        >
          <DropdownMenu
            trigger={
              <Avatar src={avatarUrl} name={username || "?"} size={28} />
            }
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
        </div>
      </nav>
      <div style={{ height: "70px" }} />
    </>
  );
}
