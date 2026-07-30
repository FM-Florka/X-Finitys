"use client";

import { useFloatingPanel } from "@/components/ui/useFloatingPanel";
import { cn } from "@/lib/utils";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function DatePicker({
  name,
  id,
  value: controlledValue,
  defaultValue = "",
  onChange,
  placeholder = "Pilih tanggal",
  disabled,
  className,
}: {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;
  const { style } = useFloatingPanel(open, triggerRef, panelRef, {
    matchWidth: false,
    maxHeight: 340,
  });

  useEffect(() => setMounted(true), []);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    try {
      return parseISO(value);
    } catch {
      return null;
    }
  }, [value]);

  const [view, setView] = useState<Date>(() => selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) setView(selectedDate);
  }, [selectedDate]);

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

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(view), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(view), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [view]);

  const commit = (next: string) => {
    if (controlledValue === undefined) setInternal(next);
    onChange?.(next);
    setOpen(false);
  };

  const clear = (e: ReactMouseEvent) => {
    e.stopPropagation();
    commit("");
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const label = selectedDate
    ? format(selectedDate, "d MMM yyyy", { locale: localeId })
    : null;

  const panel =
    open && mounted && style
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Pilih tanggal"
            style={style}
            className="w-[min(280px,calc(100vw-1.5rem))] rounded-md border border-border bg-surface p-3 shadow-[0_8px_24px_var(--float-shadow)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setView((d) => subMonths(d, 1))}
                className="rounded-md p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-medium tracking-tight">
                {format(view, "MMMM yyyy", { locale: localeId })}
              </p>
              <button
                type="button"
                onClick={() => setView((d) => addMonths(d, 1))}
                className="rounded-md p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const inMonth = isSameMonth(day, view);
                const selected = selectedDate
                  ? isSameDay(day, selectedDate)
                  : false;
                const today = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => commit(toISODate(day))}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-xs transition",
                      !inMonth && "text-muted/40",
                      inMonth && !selected && "text-foreground hover:bg-muted-bg",
                      today && !selected && "font-semibold text-accent",
                      selected && "bg-accent font-medium text-[#052e16]",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => commit(toISODate(new Date()))}
                className="rounded-md px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent-soft"
              >
                Hari ini
              </button>
              <button
                type="button"
                onClick={() => commit("")}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
              >
                Hapus
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-md border border-border bg-muted-bg px-2.5 text-left text-xs outline-none transition sm:h-9 sm:px-3 sm:text-sm",
          "hover:border-[var(--border-strong)]",
          "focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20",
          open && "border-accent/50 ring-1 ring-accent/20",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <Calendar className="size-3.5 shrink-0 text-muted sm:size-4" aria-hidden />
        <span className={cn("flex-1 truncate", !label && "text-muted")}>
          {label ?? placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={clear}
            className="rounded p-0.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
            aria-label="Hapus tanggal"
          >
            <X className="size-3.5" />
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
