"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--color-bg-2)" }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-8"
        style={{
          background: "var(--color-bg-1)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl">🀄</span>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-1)" }}
          >
            麻雀ピーチ
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
            ログインして成績を管理しよう
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-1)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
              fill="#4285F4"
            />
            <path
              d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
              fill="#34A853"
            />
            <path
              d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
              fill="#FBBC05"
            />
            <path
              d="M8.98 3.58c1.16 0 2.2.4 3.02 1.2l2.28-2.28A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.9z"
              fill="#EA4335"
            />
          </svg>
          Googleでログイン
        </button>
      </div>
    </div>
  );
}
