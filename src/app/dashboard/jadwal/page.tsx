import { JadwalClient } from "@/app/dashboard/jadwal/JadwalClient";
import { requireEdit } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleSlot } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit jadwal" };

export default async function EditJadwalPage() {
  // Hanya Wali Kelas (guru), Ketua, Wakil — role lain preview di /jadwal
  await requireEdit("jadwal");
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_slots")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("period", { ascending: true });

  const slots = (data ?? []) as ScheduleSlot[];

  return <JadwalClient slots={slots} />;
}
