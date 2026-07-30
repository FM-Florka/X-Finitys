export type AppRole =
  | "siswa"
  | "ketua"
  | "wakil"
  | "bendahara"
  | "keamanan"
  | "kebersihan"
  | "sekretaris"
  | "guru";

export type AnnouncementCategory =
  | "akademik"
  | "acara"
  | "piket"
  | "kas"
  | "umum"
  | "peringatan"
  | "tugas";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  nis: string | null;
  /** L = laki-laki, P = perempuan */
  gender: "L" | "P" | null;
  created_at: string;
  updated_at: string;
};

export type ClassMeta = {
  id: string;
  class_name: string;
  wali_kelas: string;
  motto: string | null;
  description: string | null;
  student_count: number;
  updated_at: string;
  updated_by: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  event_date: string | null;
  /** Mata pelajaran — dipakai kategori tugas */
  subject: string | null;
  pinned: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: Pick<Profile, "name" | "role"> | null;
};

/** Status kumpul per siswa per tugas (announcement category=tugas). */
export type TaskSubmission = {
  id: string;
  announcement_id: string;
  user_id: string;
  submitted: boolean;
  submitted_at: string;
};

export type Iuran = {
  id: string;
  name: string;
  target_amount: number;
  deadline: string | null;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  type: "pemasukan" | "pengeluaran";
  kind: "rutin" | "iuran" | "lain";
  amount: number;
  note: string | null;
  date: string;
  iuran_id: string | null;
  created_by: string;
  created_at: string;
  iuran?: Pick<Iuran, "name"> | null;
  creator?: Pick<Profile, "name"> | null;
};

export type PaymentStatus = {
  id: string;
  user_id: string;
  iuran_id: string | null;
  iuran_key: string;
  period_key: string;
  paid: boolean;
  amount: number;
  paid_at: string | null;
  note: string | null;
  iuran?: Pick<Iuran, "name" | "target_amount"> | null;
  profile?: Pick<Profile, "name" | "email" | "role"> | null;
};

export type ScheduleSlot = {
  id: string;
  day_of_week: number;
  period: number;
  subject: string;
  teacher: string | null;
  room: string | null;
};

export type PiketSection = "kebersihan" | "keamanan";

/** 1 kelompok tetap per (section, day_of_week 1–5). Bukan rotasi. */
export type PiketGroup = {
  id: string;
  name: string;
  section: PiketSection;
  /** 1=Senin … 5=Jumat */
  day_of_week: number;
  members: string;
  /** Legacy; app tidak pakai (rotasi dihapus). */
  week_offset?: number;
};

/** Template tugas permanen per hari/kelompok. */
export type PiketTaskDef = {
  id: string;
  group_id: string;
  task_label: string;
  sort_order: number;
  created_at: string;
};

export type PiketCheck = {
  id: string;
  group_id: string;
  date: string;
  task_label: string;
  done: boolean;
  checked_by: string | null;
  created_at: string;
};

/** Log internal pengurus keamanan (bukan feed publik). */
export type IncidentLog = {
  id: string;
  title: string;
  description: string;
  /** Legacy date-only; prefer occurred_at. */
  date: string;
  /** Waktu kejadian (timestamptz). */
  occurred_at: string;
  /** Nama siswa terlibat (opsional). */
  student_name: string | null;
  author_id: string;
  created_at: string;
  author?: Pick<Profile, "name"> | null;
};

export type Album = {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  event_date: string | null;
  author_id: string | null;
  created_at: string;
  photos?: Photo[];
  photo_count?: number;
};

export type Photo = {
  id: string;
  album_id: string;
  storage_path: string;
  caption: string | null;
  author_id: string | null;
  created_at: string;
};
