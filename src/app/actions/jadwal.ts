"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth-helpers";
import { MAX_PERIOD, MIN_PERIOD } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

function revalidateJadwal() {
  revalidatePath("/dashboard/jadwal");
  revalidatePath("/jadwal");
  revalidatePath("/");
}

/**
 * Simpan slot. Identitas logis = (hari, jam ke-).
 * Slot di sel yang sama diganti — tidak boleh 2 mapel di hari+jam sama.
 */
export async function upsertScheduleSlot(formData: FormData) {
  await requireEdit("jadwal");
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const dayOfWeek = Number(formData.get("dayOfWeek") || 0);
  const period = Number(formData.get("period") || 0);
  const subject = String(formData.get("subject") || "").trim();
  const teacher = String(formData.get("teacher") || "").trim() || null;
  const room = String(formData.get("room") || "").trim() || null;

  if (!subject) throw new Error("Mapel wajib diisi");
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 5) {
    throw new Error("Hari tidak valid");
  }
  if (
    !Number.isInteger(period) ||
    period < MIN_PERIOD ||
    period > MAX_PERIOD
  ) {
    throw new Error(`Jam ke- harus ${MIN_PERIOD}–${MAX_PERIOD}`);
  }

  const payload = {
    day_of_week: dayOfWeek,
    period,
    subject,
    teacher,
    room,
  };

  // Slot lain di sel (hari, jam) yang sama — hapus agar unique / no-dup
  let conflictQuery = supabase
    .from("schedule_slots")
    .select("id")
    .eq("day_of_week", dayOfWeek)
    .eq("period", period);
  if (id) conflictQuery = conflictQuery.neq("id", id);

  const { data: conflicts, error: conflictErr } = await conflictQuery;
  if (conflictErr) throw new Error(conflictErr.message);

  const conflictIds = (conflicts ?? [])
    .map((c) => c.id as string)
    .filter((cid) => cid && cid !== id);

  if (conflictIds.length > 0) {
    const { error: delErr } = await supabase
      .from("schedule_slots")
      .delete()
      .in("id", conflictIds);
    if (delErr) throw new Error(delErr.message);
  }

  if (id) {
    const { error } = await supabase
      .from("schedule_slots")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("schedule_slots").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidateJadwal();
}

export async function deleteScheduleSlot(formData: FormData) {
  await requireEdit("jadwal");
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("ID slot wajib");

  const { error } = await supabase.from("schedule_slots").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateJadwal();
}
