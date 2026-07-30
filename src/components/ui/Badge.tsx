import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "accent",
  className,
}: {
  children: ReactNode;
  tone?: "accent" | "muted" | "danger" | "warning";
  className?: string;
}) {
  const tones = {
    accent: "bg-accent-soft text-accent-fg border border-accent/20",
    muted: "bg-muted-bg text-muted border border-border",
    danger: "bg-[var(--danger-soft)] text-[var(--danger-fg)] border border-danger/20",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-fg)] border border-warning/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
