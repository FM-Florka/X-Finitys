"use client";

import { useFloatingPanel } from "@/components/ui/useFloatingPanel";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  label: string;
};

export function Select({
  name,
  id,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Pilih…",
  disabled,
  className,
  required,
}: {
  name?: string;
  id?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const triggerId = id ?? `${autoId}-trigger`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlledValue ?? internal;
  const selected = options.find((o) => o.value === value);
  const { style } = useFloatingPanel(open, triggerRef, panelRef, {
    matchWidth: true,
    maxHeight: 224,
  });

  useEffect(() => setMounted(true), []);

  const commit = useCallback(
    (next: string) => {
      if (controlledValue === undefined) setInternal(next);
      onChange?.(next);
      setOpen(false);
    },
    [controlledValue, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const panel =
    open && mounted && style
      ? createPortal(
          <ul
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-labelledby={triggerId}
            style={style}
            className="max-h-56 overflow-auto rounded-md border border-border bg-surface p-1 shadow-[0_8px_24px_var(--float-shadow)]"
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => commit(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-[calc(var(--radius)-2px)] px-2.5 py-1.5 text-left text-xs transition sm:py-2 sm:text-sm",
                      active
                        ? "bg-accent-soft text-accent-fg"
                        : "text-foreground hover:bg-muted-bg",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active ? (
                      <Check
                        className="size-3.5 shrink-0 text-accent"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-muted-bg px-2.5 text-left text-xs outline-none transition sm:h-9 sm:px-3 sm:text-sm",
          "hover:border-[var(--border-strong)]",
          "focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20",
          open && "border-accent/50 ring-1 ring-accent/20",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={cn("truncate", !selected && "text-muted")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted transition-transform sm:size-4",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {panel}
    </div>
  );
}
