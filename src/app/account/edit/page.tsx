"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import Avatar from "@/components/Avatar";
import Input from "@/components/Input";
import Label from "@/components/Label";
import Main from "@/components/Main";
import Button from "@/components/Button";
import Loading from "@/components/Loading";

export default function AccountEditPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUsername(profile.username);
        setAvatarUrl(profile.avatar_url);
      }
      setLoading(false);
    };
    load();
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

    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const compressed = await compressImage(file);
      setAvatarFile(compressed);
    } catch {
      setError("画像の処理に失敗しました");
    }
  };

  const handleSave = async () => {
    setError("");
    const trimmed = username.trim();

    if (trimmed.length < 1 || trimmed.length > 5) {
      setError("1〜5文字で入力してください");
      return;
    }

    if (!userId) return;

    setSaving(true);

    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        setError(`画像アップロードに失敗しました: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      // キャッシュ回避のためにタイムスタンプを付与
      newAvatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: trimmed, avatar_url: newAvatarUrl })
      .eq("id", userId);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("このユーザー名は既に使われています");
      } else {
        setError(`保存に失敗しました: ${updateError.message}`);
      }
      setSaving(false);
      return;
    }

    router.push("/");
  };

  if (loading) {
    return (
      <div
        className="flex flex-col"
        style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
      >
        <Main>
          <Loading />
        </Main>
      </div>
    );
  }

  const displayPreview = avatarPreview || avatarUrl;

  return (
    <div
      className="flex flex-col"
      style={{ background: "var(--color-bg-2)", minHeight: "100dvh" }}
    >
      <header
        className="flex items-center px-6 py-3"
        style={{
          background: "var(--color-bg-1)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="text-sm"
          style={{ color: "var(--color-text-3)" }}
        >
          ← 戻る
        </button>
      </header>

      <Main maxWidth="md" className="py-8">
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--color-text-1)",
            marginBottom: "24px",
          }}
        >
          アカウント編集
        </h1>

        <div
          style={{
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* アバター変更 */}
          <div style={{ marginBottom: "24px", textAlign: "center" }}>
            <Label style={{ marginBottom: "12px", textAlign: "left" }}>
              アイコン
            </Label>
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
                background: displayPreview ? "transparent" : "var(--color-bg-2)",
              }}
            >
              {displayPreview ? (
                <img
                  src={displayPreview}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Avatar name={username || "?"} size={76} />
              )}
            </div>
            <input
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
              タップして変更（10MB以下）
            </p>
          </div>

          {/* ユーザー名 */}
          <div style={{ marginBottom: "20px" }}>
            <Label>ユーザー名</Label>
            <Input
              type="text"
              maxLength={5}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例: たろう"
              autoComplete="off"
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
          </div>

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

          <Button onClick={handleSave} disabled={saving || !username.trim()} fullWidth>
            {saving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </Main>
    </div>
  );
}
