"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useId, useState } from "react";

export function Checkbox({
  name,
  id,
  label,
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled,
  className,
  value = "on",
}: {
  name?: string;
  id?: string;
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  value?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [internal, setInternal] = useState(defaultChecked);
  const checked = controlledChecked ?? internal;

  const toggle = () => {
    if (disabled) return;
    const next = !checked;
    if (controlledChecked === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 text-xs text-muted sm:gap-2.5 sm:text-sm",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative inline-flex size-3.5 shrink-0 sm:size-4">
        <input
          id={inputId}
          type="checkbox"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={toggle}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "flex size-3.5 items-center justify-center rounded-[4px] border border-border bg-muted-bg transition sm:size-4",
            "peer-focus-visible:border-accent/50 peer-focus-visible:ring-1 peer-focus-visible:ring-accent/20",
            "peer-checked:border-accent peer-checked:bg-accent",
          )}
        >
          <Check
            className={cn(
              "size-2.5 text-[#052e16] opacity-0 transition-opacity sm:size-3",
              checked && "opacity-100",
            )}
            strokeWidth={3}
          />
        </span>
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
