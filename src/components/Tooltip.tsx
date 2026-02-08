"use client";

import {
  useRef,
  useLayoutEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

interface TooltipProps {
  open: boolean;
  content: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Tooltip({
  open,
  content,
  children,
  style,
}: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      setOffsetX(0);
      return;
    }
    if (!tooltipRef.current) return;

    const rect = tooltipRef.current.getBoundingClientRect();
    const margin = 12;

    if (rect.left < margin) {
      setOffsetX(margin - rect.left);
    } else if (rect.right > window.innerWidth - margin) {
      setOffsetX(window.innerWidth - margin - rect.right);
    } else {
      setOffsetX(0);
    }
    setReady(true);
  }, [open]);

  return (
    <div style={{ position: "relative", ...style }}>
      {children}
      {open && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: `translateX(calc(-50% + ${offsetX}px))`,
            visibility: ready ? "visible" : "hidden",
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "8px 12px",
            boxShadow: "var(--shadow-popup)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
