"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

export type FloatingRect = {
  top: number;
  left: number;
  width: number;
};

/**
 * Positions a portal panel under a trigger, fixed to the viewport
 * so parent overflow:hidden cannot clip it.
 */
export function useFloatingPanel(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  opts?: { matchWidth?: boolean; gap?: number; maxHeight?: number },
) {
  const matchWidth = opts?.matchWidth ?? true;
  const gap = opts?.gap ?? 4;
  const maxHeight = opts?.maxHeight ?? 280;
  const [rect, setRect] = useState<FloatingRect | null>(null);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    const preferTop =
      spaceBelow < Math.min(maxHeight, 200) && spaceAbove > spaceBelow;

    setPlacement(preferTop ? "top" : "bottom");
    setRect({
      top: preferTop ? r.top - gap : r.bottom + gap,
      left: r.left,
      width: r.width,
    });
  }, [triggerRef, gap, maxHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => update();
    window.addEventListener("resize", onScroll);
    // capture scroll from any ancestor
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, update]);

  // After panel mounts, re-measure if opening upward so bottom aligns to trigger top
  useLayoutEffect(() => {
    if (!open || !rect || !panelRef.current || placement !== "top") return;
    const h = panelRef.current.offsetHeight;
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect((prev) =>
      prev
        ? { ...prev, top: r.top - gap - h, width: matchWidth ? r.width : prev.width }
        : prev,
    );
  }, [open, placement, gap, matchWidth, panelRef, triggerRef, rect?.width]);

  const style: CSSProperties | undefined = rect
    ? {
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: matchWidth ? rect.width : undefined,
        zIndex: 300,
      }
    : undefined;

  return { rect, style, placement };
}
