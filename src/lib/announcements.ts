import type { AnnouncementCategory } from "@/lib/types";

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "umum",
  "akademik",
  "acara",
  "piket",
  "kas",
  "peringatan",
  "tugas",
];

export const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  umum: "Umum",
  akademik: "Akademik",
  acara: "Acara",
  piket: "Piket",
  kas: "Kas",
  peringatan: "Peringatan",
  tugas: "Tugas",
};

export const CATEGORY_OPTIONS = ANNOUNCEMENT_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABEL[value],
}));

/** Tone badge untuk kategori biasa. */
export const CATEGORY_TONE: Record<
  AnnouncementCategory,
  "accent" | "muted" | "warning" | "danger"
> = {
  akademik: "accent",
  acara: "warning",
  piket: "muted",
  kas: "danger",
  umum: "accent",
  peringatan: "danger",
  /** Tugas: badge kategori netral; deadline pakai deadlineTone. */
  tugas: "muted",
};

export function isPeringatan(
  category: string | null | undefined,
): category is "peringatan" {
  return category === "peringatan";
}

export function isTugas(
  category: string | null | undefined,
): category is "tugas" {
  return category === "tugas";
}

export type DeadlineStatus = "ok" | "soon" | "overdue";

/** Parse YYYY-MM-DD (atau ISO) ke Date lokal midnight. */
function toLocalDateOnly(date: Date | string): Date | null {
  if (typeof date === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
    if (!m) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Sisa hari kalender: deadline − hari ini (negatif = lewat). */
export function daysUntilDeadline(
  eventDate: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!eventDate) return null;
  const target = toLocalDateOnly(eventDate);
  if (!target) return null;
  const today = toLocalDateOnly(now);
  if (!today) return null;
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Status deadline tugas:
 * - overdue: lewat hari H
 * - soon: 0–3 hari (termasuk hari H)
 * - ok: >3 hari
 */
export function deadlineStatus(
  eventDate: string | Date | null | undefined,
  now: Date = new Date(),
): DeadlineStatus | null {
  const days = daysUntilDeadline(eventDate, now);
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "ok";
}

export function deadlineTone(
  status: DeadlineStatus | null,
): "accent" | "muted" | "warning" | "danger" {
  switch (status) {
    case "overdue":
      return "danger";
    case "soon":
      return "warning";
    case "ok":
      return "accent";
    default:
      return "muted";
  }
}

/** Class chip deadline menonjol (lebih besar dari Badge biasa). */
export function deadlineChipClass(status: DeadlineStatus | null): string {
  switch (status) {
    case "overdue":
      return "border-[var(--danger)]/40 bg-[var(--danger-soft)] text-[var(--danger-fg)]";
    case "soon":
      return "border-[var(--warning)]/45 bg-[var(--warning-soft)] text-[var(--warning-fg)]";
    case "ok":
      return "border-accent/30 bg-accent-soft text-accent-fg";
    default:
      return "border-border bg-muted-bg text-muted";
  }
}

/** Label singkat status deadline untuk badge. */
export function deadlineLabel(
  eventDate: string | Date | null | undefined,
  now: Date = new Date(),
): string | null {
  const days = daysUntilDeadline(eventDate, now);
  if (days === null) return null;
  if (days < 0) {
    const late = Math.abs(days);
    return late === 1 ? "Terlambat 1 hari" : `Terlambat ${late} hari`;
  }
  if (days === 0) return "Deadline hari ini";
  if (days === 1) return "Deadline besok";
  if (days <= 3) return `${days} hari lagi`;
  return null; // UI pakai formatDate untuk ok
}
