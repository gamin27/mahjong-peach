"use client";

interface LoadingProps {
  /** テキストを非表示にする */
  compact?: boolean;
  /** カードスタイルで囲む（ページ全体のローディング用） */
  card?: boolean;
}

export default function Loading({ compact, card }: LoadingProps) {
  const inner = (
    <>
      <div
        style={{
          width: "28px",
          height: "28px",
          border: "3px solid var(--color-border)",
          borderTop: "3px solid var(--arcoblue-6)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {!compact && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-text-3)" }}>
          読み込み中...
        </p>
      )}
    </>
  );

  if (card) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg py-12"
        style={{
          background: "var(--color-bg-1)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {inner}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {inner}
    </div>
  );
}
