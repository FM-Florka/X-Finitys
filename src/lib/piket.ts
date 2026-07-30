import type { PiketGroup, PiketSection, PiketTaskDef } from "@/lib/types";
import { dayName } from "@/lib/utils";
import { SCHEDULE_DAYS } from "@/lib/schedule";

/** Senin–Jumat. */
export const PIKET_DAYS = SCHEDULE_DAYS;

export type PiketDayGroup = PiketGroup & {
  tasks: PiketTaskDef[];
  /** Status checklist hari ini, keyed by task_label */
  checksToday: Record<string, { id: string; done: boolean }>;
};

export function parseMembers(members: string | null | undefined): string[] {
  if (!members?.trim()) return [];
  return members
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatMembers(names: string[]): string {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  // unique case-insensitive, keep first casing
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of cleaned) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out.join(", ");
}

/**
 * Pastikan 5 slot hari ada per seksi (defense in depth jika migration belum seed).
 * Return groups ordered by day_of_week.
 */
export async function ensurePiketDays(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  section: PiketSection,
): Promise<PiketGroup[]> {
  const { data, error } = await supabase
    .from("piket_groups")
    .select("*")
    .eq("section", section)
    .order("day_of_week", { ascending: true });

  if (error) throw new Error(error.message);

  const existing = (data ?? []) as PiketGroup[];
  const byDay = new Map<number, PiketGroup>();
  for (const g of existing) {
    if (g.day_of_week >= 1 && g.day_of_week <= 5) {
      byDay.set(g.day_of_week, g);
    }
  }

  const missing = PIKET_DAYS.filter((d) => !byDay.has(d));
  if (missing.length > 0) {
    const rows = missing.map((d) => ({
      name: dayName(d),
      section,
      day_of_week: d,
      members: "",
      week_offset: 0,
    }));
    const { data: inserted, error: insErr } = await supabase
      .from("piket_groups")
      .insert(rows)
      .select("*");
    if (insErr) {
      // Race / unique: re-fetch
      const { data: again, error: againErr } = await supabase
        .from("piket_groups")
        .select("*")
        .eq("section", section)
        .order("day_of_week", { ascending: true });
      if (againErr) throw new Error(insErr.message);
      return ((again ?? []) as PiketGroup[]).filter(
        (g) => g.day_of_week >= 1 && g.day_of_week <= 5,
      );
    }
    for (const g of (inserted ?? []) as PiketGroup[]) {
      byDay.set(g.day_of_week, g);
    }
  }

  return PIKET_DAYS.map((d) => byDay.get(d)!).filter(Boolean);
}

export function buildPiketDayGroups(
  groups: PiketGroup[],
  tasks: PiketTaskDef[],
  checks: { id: string; group_id: string; task_label: string; done: boolean }[],
): PiketDayGroup[] {
  const tasksByGroup = new Map<string, PiketTaskDef[]>();
  for (const t of tasks) {
    const list = tasksByGroup.get(t.group_id) ?? [];
    list.push(t);
    tasksByGroup.set(t.group_id, list);
  }
  for (const list of tasksByGroup.values()) {
    list.sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.task_label.localeCompare(b.task_label),
    );
  }

  const checksByGroup = new Map<
    string,
    Record<string, { id: string; done: boolean }>
  >();
  for (const c of checks) {
    const map = checksByGroup.get(c.group_id) ?? {};
    map[c.task_label] = { id: c.id, done: c.done };
    checksByGroup.set(c.group_id, map);
  }

  return [...groups]
    .filter((g) => g.day_of_week >= 1 && g.day_of_week <= 5)
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((g) => ({
      ...g,
      tasks: tasksByGroup.get(g.id) ?? [],
      checksToday: checksByGroup.get(g.id) ?? {},
    }));
}
