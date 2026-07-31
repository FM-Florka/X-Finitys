import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
} from "@/lib/types";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "sakit",
  "izin",
  "alfa",
];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  sakit: "Sakit",
  izin: "Izin",
  alfa: "Alfa",
};

export function attendanceTone(
  status: AttendanceStatus,
): "warning" | "accent" | "danger" {
  if (status === "alfa") return "danger";
  if (status === "sakit") return "warning";
  return "accent";
}

export function isAttendanceStatus(v: string): v is AttendanceStatus {
  return (ATTENDANCE_STATUSES as string[]).includes(v);
}

/** YYYY-MM-DD untuk tanggal lokal (bukan UTC, biar tidak geser sehari). */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM untuk bulan lokal. */
export function toMonthKey(date: Date = new Date()): string {
  return toDateKey(date).slice(0, 7);
}

/** Rentang tanggal [awal, akhir] untuk satu bulan `YYYY-MM`. */
export function monthRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, m ?? 1, 0); // hari 0 bulan berikutnya = akhir bulan ini
  return { start: toDateKey(start), end: toDateKey(end) };
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

/** Daftar bulan mundur dari `current`, terbaru dulu. */
export function listRecentMonthKeys(
  current: string = toMonthKey(),
  count = 12,
): string[] {
  const [y, m] = current.split("-").map(Number);
  if (!y || !m) return [current];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(toMonthKey(d));
  }
  return out;
}

/**
 * Jumlah hari sekolah (Senin–Jumat) dalam rentang, inclusive.
 * Tidak memperhitungkan hari libur nasional — angka "hadir" di rekap
 * karenanya perkiraan, bukan absolut.
 */
export function countSchoolDays(start: string, end: string): number {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;

  let count = 0;
  const cursor = new Date(from);
  // Jangan hitung tanggal di masa depan
  const today = new Date(`${toDateKey()}T00:00:00`);
  const limit = to < today ? to : today;

  while (cursor <= limit) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Rekap per siswa dari daftar record absen.
 * `hadir` dihitung turunan: hari sekolah − total absen (floor di 0).
 */
export function summarize(
  students: { id: string; name: string }[],
  records: AttendanceRecord[],
  schoolDays: number,
): AttendanceSummary[] {
  const byUser = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const list = byUser.get(r.user_id);
    if (list) list.push(r);
    else byUser.set(r.user_id, [r]);
  }

  return students
    .map((s) => {
      const mine = byUser.get(s.id) ?? [];
      const sakit = mine.filter((r) => r.status === "sakit").length;
      const izin = mine.filter((r) => r.status === "izin").length;
      const alfa = mine.filter((r) => r.status === "alfa").length;
      return {
        user_id: s.id,
        name: s.name,
        sakit,
        izin,
        alfa,
        hadir: Math.max(0, schoolDays - (sakit + izin + alfa)),
      };
    })
    .sort((a, b) => {
      // Alfa terbanyak dulu, lalu total absen, lalu nama
      if (b.alfa !== a.alfa) return b.alfa - a.alfa;
      const totalA = a.sakit + a.izin + a.alfa;
      const totalB = b.sakit + b.izin + b.alfa;
      if (totalB !== totalA) return totalB - totalA;
      return a.name.localeCompare(b.name, "id");
    });
}
