import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "gummy-btn-primary",
  secondary: "gummy-btn-secondary",
  ghost: "gummy-btn-ghost",
  danger: "gummy-btn-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-3.5 text-sm rounded-md",
  lg: "h-10 px-4 text-sm rounded-md",
};

const spinnerSize: Record<Size, string> = {
  sm: "size-3",
  md: "size-3.5",
  lg: "size-4",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Spinner di belakang teks + auto-disable. */
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "gummy-btn inline-flex items-center justify-center gap-1.5",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
      {loading ? (
        <Loader2
          className={cn(spinnerSize[size], "shrink-0 animate-spin")}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  className?: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(
        "gummy-btn inline-flex items-center justify-center gap-1.5",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </a>
  );
}
