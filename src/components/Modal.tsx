"use client";

import type { ReactNode, CSSProperties } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  style?: CSSProperties;
}

export default function Modal({
  children,
  onClose,
  style,
}: ModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "0 24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-bg-1)",
          borderRadius: "12px",
          padding: "12px",
          maxWidth: "420px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "var(--shadow-popup)",
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
