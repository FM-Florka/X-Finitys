"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { isAttendanceStatus } from "@/lib/absensi";

function revalidateAbsensi() {
  revalidatePath("/dashboard/absensi");
  revalidatePath("/dashboard/saya");
  revalidatePath("/dashboard");
}

function parseDate(raw: string): string {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error("Tanggal tidak valid");
  }
  return s;
}

/**
 * Tandai satu siswa tidak hadir pada tanggal tertentu.
 * Upsert: kalau sudah ada entri untuk (siswa, tanggal), statusnya diperbarui.
 */
export async function markAbsent(formData: FormData) {
  const profile = await requireEdit("absensi");
  const supabase = await createClient();

  const userId = String(formData.get("userId") || "").trim();
  const date = parseDate(String(formData.get("date") || ""));
  const status = String(formData.get("status") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;

  if (!userId) throw new Error("Siswa wajib dipilih");
  if (!isAttendanceStatus(status)) {
    throw new Error("Status harus sakit, izin, atau alfa");
  }

  const { error } = await supabase.from("attendance_records").upsert(
    {
      user_id: userId,
      date,
      status,
      note,
      recorded_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);

  revalidateAbsensi();
}

/** Batalkan entri absen — siswa kembali dihitung hadir. */
export async function clearAbsence(formData: FormData) {
  await requireEdit("absensi");
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("ID entri wajib");

  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateAbsensi();
}
