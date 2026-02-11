"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

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
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{
              lineHeight: 1,
              padding: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Avatar src={avatarUrl} name={username || "?"} size={28} />
          </button>
          {showMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                right: 0,
                background: "var(--color-bg-1)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                boxShadow: "var(--shadow-popup)",
                minWidth: "160px",
                overflow: "hidden",
                zIndex: 100,
              }}
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  router.push("/account/edit");
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: "var(--color-text-1)",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                アカウント編集
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleLogout();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  color: "var(--red-6)",
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </nav>
      <div style={{ height: "70px" }} />
    </>
  );
}
