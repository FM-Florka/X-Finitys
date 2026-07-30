import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CardVariant = "flat" | "metric" | "metricAccent" | "hero";

export function Card({
  className,
  children,
  accent = false,
  padded = true,
  variant,
}: {
  className?: string;
  children: ReactNode;
  /** @deprecated use variant */
  accent?: boolean;
  padded?: boolean;
  variant?: CardVariant;
}) {
  const v: CardVariant = variant ?? (accent ? "metricAccent" : "flat");

  const styles: Record<CardVariant, string> = {
    flat: "surface",
    metric: "gummy",
    metricAccent: "gummy-accent",
    hero: "gummy-hero",
  };

  return (
    <div className={cn(styles[v], padded && "p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-sm font-semibold tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function CardDesc({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1 text-sm text-muted", className)}>{children}</p>
  );
}
