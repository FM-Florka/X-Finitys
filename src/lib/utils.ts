export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format angka untuk input ketik: 5000 → "5.000" (tanpa desimal biar caret aman). */
export function formatRpInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.floor(amount));
}

/** Parse string input berformat (5.000 / 5.000,00 / 5000) → integer Rp. */
export function parseRpInput(raw: string): number {
  if (!raw) return 0;
  // Hanya digit — titik/koma pemisah diabaikan (input Rp integer).
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? "—";
}

/** JS getDay(): 0=Minggu … 6=Sabtu → our 1=Senin … 5=Jumat */
export function todaySchoolDay(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

/** ISO week period: YYYY-Www (Senin–Minggu). Dipakai kas rutin. */
export function currentPeriodKey(date: Date = new Date()): string {
  return weekPeriodKey(date);
}

/** Period key ISO week: Senin sebagai awal minggu. */
export function weekPeriodKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO: Kamis menentukan nomor minggu
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Parse period key → Senin minggu itu (UTC noon). */
export function periodKeyToDate(periodKey: string): Date | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  // ISO week 1 = week with Jan 4
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  return monday;
}

export function previousPeriodKey(periodKey: string): string | null {
  const d = periodKeyToDate(periodKey);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() - 7);
  return weekPeriodKey(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatPeriodLabel(periodKey: string): string {
  const d = periodKeyToDate(periodKey);
  if (!d) return periodKey;
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  const m = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  const weekNo = m ? Number(m[2]) : null;
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
    }).format(x);
  const range = `${fmt(d)} – ${fmt(end)}`;
  if (weekNo != null) return `Minggu ${weekNo} · ${range}`;
  return `${range} (${periodKey})`;
}

/** Daftar period keys dari `current` mundur `count` minggu (inclusive, terbaru dulu). */
export function listRecentPeriodKeys(
  current: string = currentPeriodKey(),
  count = 16,
): string[] {
  const out: string[] = [];
  let key: string | null = current;
  for (let i = 0; i < count && key; i++) {
    out.push(key);
    key = previousPeriodKey(key);
  }
  return out;
}

/** Target kas rutin per minggu (Rp). */
export const KAS_RUTIN_TARGET = 2000;

export type PayState = "lunas" | "kurang" | "belum";

export function payStateFrom(paidAmount: number, due: number): PayState {
  if (due <= 0 || paidAmount >= due) return "lunas";
  if (paidAmount > 0) return "kurang";
  return "belum";
}

export function payStateLabel(
  state: PayState,
  sisa = 0,
  credit = 0,
): string {
  if (state === "lunas") {
    if (credit > 0) return `Lunas · kredit ${formatRp(credit)}`;
    return "Lunas";
  }
  if (state === "kurang") return `Kurang (+${formatRp(sisa)})`;
  return "Belum";
}

export function payStateTone(
  state: PayState,
): "accent" | "warning" | "danger" {
  if (state === "lunas") return "accent";
  if (state === "kurang") return "warning";
  return "danger";
}
