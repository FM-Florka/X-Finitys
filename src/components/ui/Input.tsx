"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* Flat form controls — white + thin border */
const fieldClass =
  "w-full rounded-md border border-border bg-muted-bg px-2.5 py-1.5 text-xs text-foreground outline-none " +
  "placeholder:text-muted/60 transition " +
  "hover:border-[var(--border-strong)] " +
  "focus:border-accent/50 focus:ring-1 focus:ring-accent/20 " +
  "sm:px-3 sm:py-2 sm:text-sm";

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1 block text-xs font-medium text-foreground sm:mb-1.5 sm:text-sm",
        className,
      )}
    >
      {children}
    </label>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldClass, className)} {...props} />;
});

export function Textarea({
  className,
  onChange,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const min = parseFloat(getComputedStyle(el).minHeight) || 64;
    el.style.height = `${Math.max(el.scrollHeight, min)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [resize, props.value, props.defaultValue]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={props.rows ?? 3}
      className={cn(
        fieldClass,
        "min-h-16 resize-none overflow-hidden sm:min-h-24",
        className,
      )}
      onChange={(e) => {
        onChange?.(e);
        requestAnimationFrame(resize);
      }}
      onInput={resize}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
