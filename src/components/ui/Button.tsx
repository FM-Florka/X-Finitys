import { cn } from "@/lib/utils";
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

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
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
      {...props}
    >
      {children}
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
