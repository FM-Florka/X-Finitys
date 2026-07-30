"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "relative z-[1] flex max-h-[min(90vh,680px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_16px_48px_var(--float-shadow)] sm:max-w-lg",
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-2 border-b border-border px-3.5 py-3 sm:gap-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              {title ? (
                <h2
                  id={titleId}
                  className="text-sm font-semibold tracking-tight sm:text-base"
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descId} className="mt-0.5 text-xs text-muted sm:mt-1 sm:text-sm">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted transition hover:bg-muted-bg hover:text-foreground sm:p-1.5"
              aria-label="Tutup dialog"
            >
              <X className="size-3.5 sm:size-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-3.5 py-3.5 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
