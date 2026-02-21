"use client";

import Avatar from "@/components/Avatar";
import Input from "@/components/Input";
import Field from "@/components/Field";
import Main from "@/components/Main";
import Button from "@/components/Button";
import Loading from "@/components/Loading";
import Card from "@/components/Card";
import { useAccountEdit } from "./hooks/useAccountEdit";

export default function AccountEditPage() {
  const {
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
  } = useAccountEdit();

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
          onClick={goBack}
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
          }}
        >
          アカウント編集
        </h1>

        <Card className="p-6">
          {/* アバター変更 */}
          <Field label="アイコン" className="mb-6 text-center">
            <div
              onClick={openFilePicker}
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
              タップして変更（10MB以下）
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

          <Button onClick={handleSave} disabled={saving || !username.trim()} fullWidth>
            {saving ? "保存中..." : "保存する"}
          </Button>
        </Card>
      </Main>
    </div>
  );
}
