"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import Input from "@/components/Input";
import Field from "@/components/Field";
import Main from "@/components/Main";
import Card from "@/components/Card";
import Icon from "@mdi/react";
import { mdiCards } from "@mdi/js";

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);

      // 既にプロフィールがあればホームへ
      supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) router.replace("/");
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("画像は10MB以下にしてください");
      return;
    }

    setError("");

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // 500KBに圧縮
    try {
      const compressed = await compressImage(file);
      setAvatarFile(compressed);
    } catch {
      setError("画像の処理に失敗しました");
    }
  };

  const handleSubmit = async () => {
    setError("");
    const trimmed = username.trim();

    if (trimmed.length < 1 || trimmed.length > 5) {
      setError("1〜5文字で入力してください");
      return;
    }

    if (!userId) {
      router.replace("/login");
      return;
    }

    setLoading(true);

    let avatarUrl: string | null = null;

    // アバター画像をアップロード
    if (avatarFile) {
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        setError(`画像アップロードに失敗しました: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      avatarUrl = publicUrl.publicUrl;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      username: trimmed,
      avatar_url: avatarUrl,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("このユーザー名は既に使われています");
      } else {
        setError(`登録に失敗しました: ${insertError.message}`);
      }
      setLoading(false);
      return;
    }

    router.replace("/");
  };

  return (
    <div style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}>
      <Main maxWidth="md" style={{ paddingTop: "80px", paddingBottom: "32px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Icon path={mdiCards} size={3} color="var(--arcoblue-6)" />
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "var(--color-text-1)",
              marginTop: "12px",
            }}
          >
            ようこそ！
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-3)",
              marginTop: "4px",
            }}
          >
            麻雀ピーチで使うプロフィールを設定してください
          </p>
        </div>

        <Card className="p-6">
          {/* アバター設定 */}
          <Field label="アイコン（任意）" className="mb-5 text-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                margin: "0 auto",
                cursor: "pointer",
                overflow: "hidden",
                border: "2px dashed var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...(avatarPreview
                  ? {
                      backgroundImage: `url(${avatarPreview})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : { background: "var(--color-bg-2)" }),
              }}
            >
              {!avatarPreview && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-3)",
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  タップして
                  <br />
                  選択
                </span>
              )}
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-3)",
                marginTop: "8px",
              }}
            >
              10MB以下の画像
            </p>
          </Field>

          {/* ユーザー名 */}
          <Field label="ユーザー名" className="mb-5">
            <Input
              type="text"
              maxLength={5}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例: たろう"
              autoComplete="off"
              autoFocus
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-3)",
                marginTop: "4px",
              }}
            >
              {username.trim().length}/5文字
            </p>
          </Field>

          {error && (
            <p
              style={{
                fontSize: "14px",
                color: "var(--red-6)",
                marginBottom: "16px",
              }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !username.trim()}
            style={{
              width: "100%",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "none",
              background: "var(--arcoblue-6)",
              color: "#fff",
              cursor: loading || !username.trim() ? "not-allowed" : "pointer",
              opacity: loading || !username.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "登録中..." : "はじめる"}
          </button>
        </Card>
      </Main>
    </div>
  );
}
