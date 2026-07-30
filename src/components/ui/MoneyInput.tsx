"use client";

import { Input } from "@/components/ui/Input";
import { cn, formatRpInput, parseRpInput } from "@/lib/utils";
import {
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  /** Nilai numerik (Rp, integer). */
  value: number;
  onValueChange: (value: number) => void;
  /** Nama field hidden untuk form native (opsional). */
  name?: string;
};

/**
 * Input nominal live format id-ID: 5000 → 5.000
 * Caret di-maintain agar ketik di tengah tidak loncat.
 */
export function MoneyInput({
  value,
  onValueChange,
  name,
  className,
  placeholder = "0",
  ...props
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const display = value > 0 ? formatRpInput(value) : "";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caretRef.current == null) return;
    const pos = Math.min(caretRef.current, el.value.length);
    el.setSelectionRange(pos, pos);
    caretRef.current = null;
  }, [display]);

  function handleChange(raw: string, selectionStart: number | null) {
    const digitsBeforeCaret = raw
      .slice(0, selectionStart ?? raw.length)
      .replace(/[^\d]/g, "").length;

    const next = parseRpInput(raw);
    const nextDisplay = next > 0 ? formatRpInput(next) : "";

    // Cari posisi caret baru: setelah N digit yang sama di string terformat
    let seen = 0;
    let pos = nextDisplay.length;
    for (let i = 0; i < nextDisplay.length; i++) {
      if (/\d/.test(nextDisplay[i]!)) {
        seen += 1;
        if (seen >= digitsBeforeCaret) {
          pos = i + 1;
          break;
        }
      }
    }
    if (digitsBeforeCaret === 0) pos = 0;

    caretRef.current = pos;
    onValueChange(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Blok non-digit navigasi kecuali kontrol umum
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.key.length !== 1 // allow Backspace, arrows, Tab, etc.
    ) {
      return;
    }
    if (!/\d/.test(e.key)) {
      e.preventDefault();
    }
  }

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted sm:left-3 sm:text-sm"
        aria-hidden
      >
        Rp
      </span>
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onKeyDown={onKeyDown}
        onChange={(e) =>
          handleChange(e.target.value, e.target.selectionStart)
        }
        className={cn("pl-8 sm:pl-9 tabular-nums", className)}
      />
      {name ? (
        <input type="hidden" name={name} value={value > 0 ? value : ""} />
      ) : null}
    </div>
  );
}
