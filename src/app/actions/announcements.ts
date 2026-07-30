"use server";

import { revalidatePath } from "next/cache";
import { requirePengumumanWrite, requireProfile } from "@/lib/auth-helpers";
import {
  canCreateTugas,
  canResetTaskSubmission,
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { AnnouncementCategory, AppRole } from "@/lib/types";

const FULL_CATEGORIES: AnnouncementCategory[] = [
  "umum",
  "akademik",
  "acara",
  "piket",
  "kas",
  "peringatan",
  "tugas",
];

function revalidateAnnouncementPaths() {
  revalidatePath("/dashboard/pengumuman");
  revalidatePath("/informasi");
  revalidatePath("/");
}

export async function createAnnouncement(formData: FormData) {
  const { profile, fullEditor, peringatanOnly } =
    await requirePengumumanWrite();
  const supabase = await createClient();

  let category = String(
    formData.get("category") || "umum",
  ) as AnnouncementCategory;
  const pinned = formData.get("pinned") === "on";
  const eventDateRaw = String(formData.get("eventDate") || "").trim();

  // Role seksi piket: hanya boleh kategori peringatan
  if (peringatanOnly) {
    category = "peringatan";
  } else if (!FULL_CATEGORIES.includes(category)) {
    category = "umum";
  }

  if (category === "peringatan") {
    const studentName = String(formData.get("studentName") || "").trim();
    const violation = String(formData.get("violation") || "").trim();
    const incidentDate = String(formData.get("incidentDate") || "").trim();

    if (!studentName || !violation) {
      throw new Error("Nama siswa dan keterangan pelanggaran wajib");
    }

    const title = `Peringatan: ${studentName}`;
    const bodyLines = [
      `Siswa: ${studentName}`,
      `Pelanggaran: ${violation}`,
    ];
    if (incidentDate) {
      bodyLines.push(`Tanggal kejadian: ${incidentDate}`);
    }
    const body = bodyLines.join("\n");

    const { error } = await supabase.from("announcements").insert({
      title,
      body,
      category: "peringatan",
      pinned: fullEditor ? pinned : false,
      event_date: incidentDate || null,
      subject: null,
      author_id: profile.id,
    });
    if (error) throw new Error(error.message);
  } else if (category === "tugas") {
    if (!fullEditor || !canCreateTugas(profile.role as AppRole)) {
      throw new Error("Tidak punya izin membuat tugas");
    }
    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const deadline =
      eventDateRaw || String(formData.get("deadline") || "").trim();

    if (!title || !body) throw new Error("Judul dan keterangan tugas wajib");
    if (!deadline) throw new Error("Deadline tugas wajib diisi");

    const { error } = await supabase.from("announcements").insert({
      title,
      body,
      category: "tugas",
      pinned,
      event_date: deadline,
      subject: subject || null,
      author_id: profile.id,
    });
    if (error) throw new Error(error.message);
  } else {
    if (!fullEditor) {
      throw new Error("Tidak punya izin membuat pengumuman ini");
    }
    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    if (!title || !body) throw new Error("Judul dan isi wajib");

    const { error } = await supabase.from("announcements").insert({
      title,
      body,
      category,
      pinned,
      event_date: eventDateRaw || null,
      subject: null,
      author_id: profile.id,
    });
    if (error) throw new Error(error.message);
  }

  revalidateAnnouncementPaths();
}

export async function deleteAnnouncement(formData: FormData) {
  const { profile, fullEditor, peringatanOnly } =
    await requirePengumumanWrite();
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("ID wajib");

  if (fullEditor) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } else if (peringatanOnly) {
    // Hanya hapus peringatan milik sendiri
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id)
      .eq("category", "peringatan")
      .eq("author_id", profile.id);
    if (error) throw new Error(error.message);
  }

  revalidateAnnouncementPaths();
}

export async function togglePin(formData: FormData) {
  const { fullEditor } = await requirePengumumanWrite();
  if (!fullEditor) throw new Error("Tidak punya izin menyematkan");

  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  const pinned = String(formData.get("pinned") || "") === "true";

  const { error } = await supabase
    .from("announcements")
    .update({ pinned: !pinned })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/pengumuman");
  revalidatePath("/");
}

/**
 * Siswa (atau role lain) menandai tugas sudah dikumpulkan.
 * Final: sekali submit, tidak bisa dibatalkan sendiri.
 */
export async function submitTask(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const announcementId = String(formData.get("announcementId") || "").trim();
  if (!announcementId) throw new Error("ID tugas wajib");

  const { data: ann, error: annErr } = await supabase
    .from("announcements")
    .select("id, category")
    .eq("id", announcementId)
    .maybeSingle();

  if (annErr) throw new Error(annErr.message);
  if (!ann || ann.category !== "tugas") {
    throw new Error("Bukan entri tugas");
  }

  const { data: existing } = await supabase
    .from("task_submissions")
    .select("id")
    .eq("announcement_id", announcementId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    // Sudah final — no-op
    revalidatePath("/dashboard/pengumuman");
    return;
  }

  const { error } = await supabase.from("task_submissions").insert({
    announcement_id: announcementId,
    user_id: profile.id,
    submitted: true,
  });
  if (error) throw new Error(error.message);

  revalidateAnnouncementPaths();
}

/**
 * Batalkan status kumpul (salah pencet) — hanya ketua/wakil/guru.
 * formData: announcementId, userId (opsional; default current user target row)
 */
export async function resetTaskSubmission(formData: FormData) {
  const profile = await requireProfile();
  if (!canResetTaskSubmission(profile.role as AppRole)) {
    throw new Error("Tidak punya izin membatalkan status kumpul");
  }

  const supabase = await createClient();
  const announcementId = String(formData.get("announcementId") || "").trim();
  const userId =
    String(formData.get("userId") || "").trim() || profile.id;
  if (!announcementId) throw new Error("ID tugas wajib");

  const { error } = await supabase
    .from("task_submissions")
    .delete()
    .eq("announcement_id", announcementId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidateAnnouncementPaths();
}
