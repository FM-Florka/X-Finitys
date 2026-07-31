import type { AppRole } from "@/lib/types";

export type { AppRole };

export const ROLES: AppRole[] = [
  "siswa",
  "ketua",
  "wakil",
  "bendahara",
  "keamanan",
  "kebersihan",
  "sekretaris",
  "guru",
];

export const ROLE_LABEL: Record<AppRole, string> = {
  siswa: "Siswa",
  ketua: "Ketua Kelas",
  wakil: "Wakil Ketua",
  bendahara: "Bendahara",
  keamanan: "Keamanan",
  kebersihan: "Kebersihan",
  sekretaris: "Sekretaris",
  guru: "Wali Kelas",
};

/** Modul dashboard yang bisa di-view / di-edit. */
export type AppModule =
  | "kas"
  | "pengumuman"
  | "pengurus"
  | "keamanan"
  | "piket-kebersihan"
  | "jadwal"
  | "galeri"
  | "absensi"
  | "materi";

/** @deprecated pakai AppModule */
export type EditModule = AppModule;

const ALL_MODULES: AppModule[] = [
  "kas",
  "pengumuman",
  "pengurus",
  "jadwal",
  "galeri",
  "keamanan",
  "piket-kebersihan",
  "absensi",
  "materi",
];

/** Materi: semua role boleh buka dan upload. */
const MATERI: AppModule[] = ["materi"];

function normalizeRole(
  role: AppRole | string | undefined,
): AppRole | null {
  if (!role) return null;
  const key = String(role).trim().toLowerCase();
  if (!(ROLES as string[]).includes(key)) return null;
  return key as AppRole;
}

/**
 * Siapa boleh **buka** halaman modul (nav + requireView + middleware).
 * Ringkasan `/dashboard` & Data saya selalu boleh (di luar matrix).
 * /jadwal publik: semua role + guest (bukan modul dashboard).
 *
 * Matriks:
 * - Wali (guru), Ketua, Wakil → semua
 * - Bendahara → kas, pengumuman, galeri, materi
 * - Sekretaris → pengumuman, galeri, absensi, materi
 * - Keamanan → keamanan (log internal), pengumuman, galeri, materi
 * - Kebersihan → piket-kebersihan, pengumuman, galeri, materi
 * - Siswa → pengumuman, materi
 * - Absensi edit: guru/ketua/wakil/sekretaris
 * - Materi: semua role upload; hapus any → canDeleteAnyMateri
 */
export const VIEW_ACCESS: Record<AppRole, AppModule[]> = {
  /** Siswa: pengumuman (tugas + centang kumpul) & materi. */
  siswa: ["pengumuman", ...MATERI],
  ketua: [...ALL_MODULES],
  wakil: [...ALL_MODULES],
  guru: [...ALL_MODULES],
  bendahara: ["kas", "pengumuman", "galeri", ...MATERI],
  sekretaris: ["pengumuman", "galeri", "absensi", ...MATERI],
  keamanan: ["keamanan", "pengumuman", "galeri", ...MATERI],
  kebersihan: ["piket-kebersihan", "pengumuman", "galeri", ...MATERI],
};

/**
 * Siapa boleh **menulis** di modul (tombol, form, server action).
 * Harus ⊆ VIEW_ACCESS untuk modul yang sama.
 * Peringatan piket: keamanan/kebersihan lewat canCreatePeringatan (bukan full pengumuman).
 */
export const EDIT_ACCESS: Record<AppRole, AppModule[]> = {
  /** Materi: semua role boleh upload (hapus dibatasi ke file sendiri). */
  siswa: [...MATERI],
  ketua: [...ALL_MODULES],
  wakil: [...ALL_MODULES],
  guru: [...ALL_MODULES],
  bendahara: ["kas", ...MATERI],
  keamanan: ["keamanan", ...MATERI],
  kebersihan: ["piket-kebersihan", ...MATERI],
  sekretaris: ["pengumuman", "galeri", "absensi", ...MATERI],
};

/** Prefix path dashboard → modul (urutan: spesifik dulu). */
export const DASHBOARD_ROUTE_MODULES: {
  prefix: string;
  module: AppModule;
}[] = [
  { prefix: "/dashboard/keamanan", module: "keamanan" },
  // legacy redirect target masih di-map biar middleware tidak bocor sebelum redirect
  { prefix: "/dashboard/piket/keamanan", module: "keamanan" },
  { prefix: "/dashboard/piket/kebersihan", module: "piket-kebersihan" },
  { prefix: "/dashboard/pengumuman", module: "pengumuman" },
  { prefix: "/dashboard/pengurus", module: "pengurus" },
  { prefix: "/dashboard/jadwal", module: "jadwal" },
  { prefix: "/dashboard/galeri", module: "galeri" },
  { prefix: "/dashboard/kas", module: "kas" },
  { prefix: "/dashboard/absensi", module: "absensi" },
  { prefix: "/dashboard/materi", module: "materi" },
];

/** Role yang boleh isi/ubah absensi — mirror RLS di migration 014. */
export const ABSENSI_EDITOR_ROLES: AppRole[] = [
  "guru",
  "ketua",
  "wakil",
  "sekretaris",
];

/**
 * Boleh hapus materi milik orang lain.
 * Upload & hapus milik sendiri: semua role (lihat EDIT_ACCESS).
 */
export function canDeleteAnyMateri(
  role: AppRole | string | undefined,
): boolean {
  const key = normalizeRole(role);
  return key === "guru" || key === "ketua" || key === "wakil";
}

export function moduleForDashboardPath(path: string): AppModule | null {
  const clean = path.split("?")[0]?.replace(/\/$/, "") || path;
  for (const row of DASHBOARD_ROUTE_MODULES) {
    if (clean === row.prefix || clean.startsWith(`${row.prefix}/`)) {
      return row.module;
    }
  }
  return null;
}

export function canView(
  role: AppRole | string | undefined,
  module: AppModule,
): boolean {
  const key = normalizeRole(role);
  if (!key) return false;
  return VIEW_ACCESS[key].includes(module);
}

export function canEdit(
  role: AppRole | string | undefined,
  module: AppModule,
): boolean {
  const key = normalizeRole(role);
  if (!key) return false;
  return EDIT_ACCESS[key].includes(module);
}

/** Full editor pengumuman (semua kategori). */
export function canEditPengumuman(
  role: AppRole | string | undefined,
): boolean {
  return canEdit(role, "pengumuman");
}

/**
 * Boleh buat entri kategori "Peringatan" (piket).
 * Keamanan & kebersihan + full pengumuman editors.
 */
export function canCreatePeringatan(
  role: AppRole | string | undefined,
): boolean {
  const key = normalizeRole(role);
  if (!key) return false;
  if (canEdit(key, "pengumuman")) return true;
  return key === "keamanan" || key === "kebersihan";
}

/**
 * Boleh buat/kelola kategori "Tugas".
 * Full pengumuman editors: ketua, wakil, sekretaris, guru.
 */
export function canCreateTugas(
  role: AppRole | string | undefined,
): boolean {
  return canEditPengumuman(role);
}

/**
 * Boleh batalkan status kumpul siswa (salah pencet).
 * Ketua / Wakil / Wali — bukan sekretaris, bukan siswa.
 */
export function canResetTaskSubmission(
  role: AppRole | string | undefined,
): boolean {
  const key = normalizeRole(role);
  return key === "ketua" || key === "wakil" || key === "guru";
}

/** Boleh buka halaman pengumuman dashboard (view atau buat peringatan). */
export function canAccessPengumuman(
  role: AppRole | string | undefined,
): boolean {
  return canView(role, "pengumuman") || canCreatePeringatan(role);
}

/** Role yang boleh kelola kas (tulis). */
export const KAS_EDITOR_ROLES: AppRole[] = [
  "ketua",
  "wakil",
  "bendahara",
  "guru",
];

export function isKasEditor(role: AppRole | string | undefined): boolean {
  return canEdit(role, "kas");
}

export function dashboardHome(role: AppRole | string | undefined): string {
  switch (normalizeRole(role)) {
    case "bendahara":
      return "/dashboard/kas";
    case "keamanan":
      return "/dashboard/keamanan";
    case "kebersihan":
      return "/dashboard/piket/kebersihan";
    case "guru":
      return "/dashboard";
    case "siswa":
      return "/dashboard/saya";
    case "sekretaris":
      return "/dashboard/pengumuman";
    default:
      return "/dashboard";
  }
}
