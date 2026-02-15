import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";

export function useAccountEdit() {
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

  const openFilePicker = () => fileInputRef.current?.click();
  const goBack = () => router.back();
  const displayPreview = avatarPreview || avatarUrl;

  return {
    username,
    setUsername,
    error,
    saving,
    loading,
    fileInputRef,
    handleFileChange,
    handleSave,
    openFilePicker,
    goBack,
    displayPreview,
  };
}
