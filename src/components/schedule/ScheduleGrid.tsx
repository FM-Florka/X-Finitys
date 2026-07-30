"use client";

import type { ScheduleSlot } from "@/lib/types";
import {
  SCHEDULE_DAYS,
  buildSlotMap,
  scheduleCellKey,
  schedulePeriods,
} from "@/lib/schedule";
import { cn, dayName, todaySchoolDay } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export type ScheduleGridMode = "preview" | "edit";

export function ScheduleGrid({
  slots,
  mode = "preview",
  highlightToday = true,
  emptyMessage = "Jadwal masih kosong.",
  onAdd,
  onEdit,
  onDelete,
  className,
  header,
}: {
  slots: ScheduleSlot[];
  mode?: ScheduleGridMode;
  highlightToday?: boolean;
  emptyMessage?: string;
  onAdd?: (dayOfWeek: number, period: number) => void;
  onEdit?: (slot: ScheduleSlot) => void;
  onDelete?: (slot: ScheduleSlot) => void;
  className?: string;
  header?: ReactNode;
}) {
  const periods = schedulePeriods(slots);
  const slotMap = buildSlotMap(slots);
  const today = todaySchoolDay();
  const editable = mode === "edit";
  const isEmpty = slots.length === 0 && !editable;

  return (
    <div className={cn("overflow-hidden", className)}>
      {header}
      {isEmpty ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted-bg/50 text-left">
                <th className="w-16 px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-muted sm:px-3 sm:py-3">
                  Jam
                </th>
                {SCHEDULE_DAYS.map((d) => (
                  <th
                    key={d}
                    className={cn(
                      "px-2 py-2.5 text-xs font-medium uppercase tracking-wider sm:px-3 sm:py-3",
                      highlightToday && d === today
                        ? "bg-accent-soft text-accent-fg"
                        : "text-muted",
                    )}
                  >
                    {dayName(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p} className="border-t border-border">
                  <td className="px-2 py-2 align-middle font-medium text-muted sm:px-3 sm:py-2.5">
                    <span className="text-xs sm:text-sm">Ke-{p}</span>
                  </td>
                  {SCHEDULE_DAYS.map((d) => {
                    const slot = slotMap.get(scheduleCellKey(d, p));
                    const isTodayCol = highlightToday && d === today;

                    if (slot) {
                      return (
                        <td
                          key={d}
                          className={cn(
                            "group relative px-1.5 py-1.5 align-top sm:px-2 sm:py-2",
                            isTodayCol && "bg-accent-soft/30",
                          )}
                        >
                          {editable ? (
                            <button
                              type="button"
                              onClick={() => onEdit?.(slot)}
                              className={cn(
                                "w-full rounded-md border border-border bg-surface px-2 py-2 text-left transition",
                                "hover:border-accent/40 hover:bg-muted-bg/60",
                                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/30",
                              )}
                            >
                              <p className="font-medium leading-snug">
                                {slot.subject}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted sm:text-xs">
                                {slot.teacher || "—"}
                                {slot.room ? ` · ${slot.room}` : ""}
                              </p>
                              <span className="mt-1.5 flex items-center gap-1 opacity-70 transition group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                                <span className="inline-flex items-center gap-0.5 rounded border border-border bg-muted-bg px-1.5 py-0.5 text-[10px] font-medium text-muted">
                                  <Pencil className="size-2.5" aria-hidden />
                                  Edit
                                </span>
                              </span>
                            </button>
                          ) : (
                            <div className="rounded-md px-2 py-1.5">
                              <p className="font-medium leading-snug">
                                {slot.subject}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-snug text-muted sm:text-xs">
                                {slot.teacher || "—"}
                                {slot.room ? ` · ${slot.room}` : ""}
                              </p>
                            </div>
                          )}
                          {editable && onDelete ? (
                            <button
                              type="button"
                              title="Hapus slot"
                              aria-label={`Hapus ${slot.subject}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(slot);
                              }}
                              className={cn(
                                "absolute right-2 top-2 rounded-md border border-border bg-surface p-1 text-muted",
                                "opacity-100 transition hover:border-[var(--danger)]/40 hover:bg-[var(--danger-soft)] hover:text-[var(--danger-fg)]",
                                "sm:opacity-0 sm:group-hover:opacity-100",
                              )}
                            >
                              <Trash2 className="size-3" aria-hidden />
                            </button>
                          ) : null}
                        </td>
                      );
                    }

                    if (editable) {
                      return (
                        <td
                          key={d}
                          className={cn(
                            "px-1.5 py-1.5 align-top sm:px-2 sm:py-2",
                            isTodayCol && "bg-accent-soft/20",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onAdd?.(d, p)}
                            className={cn(
                              "flex h-full min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border/80",
                              "bg-transparent text-muted transition",
                              "hover:border-accent/40 hover:bg-accent-soft/30 hover:text-accent-fg",
                              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/30",
                            )}
                            aria-label={`Tambah mapel ${dayName(d)} jam ke-${p}`}
                          >
                            <Plus className="size-4" aria-hidden />
                            <span className="text-[10px] font-medium">
                              Tambah
                            </span>
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={d}
                        className={cn(
                          "px-3 py-3 align-top text-muted",
                          isTodayCol && "bg-accent-soft/30",
                        )}
                      >
                        <span className="text-xs">—</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
