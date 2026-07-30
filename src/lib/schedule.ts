import type { ScheduleSlot } from "@/lib/types";

/** Senin–Jumat (1–5). */
export const SCHEDULE_DAYS = [1, 2, 3, 4, 5] as const;

/** Jam ke- default ditampilkan di grid (bisa diisi 1–12). */
export const DEFAULT_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const MAX_PERIOD = 12;
export const MIN_PERIOD = 1;

export type ScheduleCellKey = `${number}-${number}`;

export function scheduleCellKey(
  dayOfWeek: number,
  period: number,
): ScheduleCellKey {
  return `${dayOfWeek}-${period}`;
}

/** Map hari-jam → slot. Duplikat (pra-migration) di-overwrite last-wins. */
export function buildSlotMap(
  slots: ScheduleSlot[],
): Map<ScheduleCellKey, ScheduleSlot> {
  const map = new Map<ScheduleCellKey, ScheduleSlot>();
  for (const s of slots) {
    map.set(scheduleCellKey(s.day_of_week, s.period), s);
  }
  return map;
}

/**
 * Baris jam di grid: minimal DEFAULT_PERIODS, plus period yang sudah terisi
 * di luar default (hingga MAX_PERIOD).
 */
export function schedulePeriods(slots: ScheduleSlot[]): number[] {
  const set = new Set<number>(DEFAULT_PERIODS);
  for (const s of slots) {
    if (s.period >= MIN_PERIOD && s.period <= MAX_PERIOD) {
      set.add(s.period);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}
