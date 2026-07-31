import { requireView } from "@/lib/auth-helpers";
import { canEdit } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  countSchoolDays,
  monthRange,
  summarize,
  toDateKey,
  toMonthKey,
} from "@/lib/absensi";
import type { AttendanceRecord, Profile } from "@/lib/types";
import { AbsensiClient } from "./AbsensiClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Absensi" };

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  const profile = await requireView("absensi");
  const canWrite = canEdit(profile.role, "absensi");
  const supabase = await createClient();

  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? params.date!
    : toDateKey();
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? params.month!
    : toMonthKey();

  const { start, end } = monthRange(month);

  const [studentsRes, dayRes, monthRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, nis")
      .neq("role", "guru")
      .order("name", { ascending: true }),
    supabase
      .from("attendance_records")
      .select("*, profile:profiles!user_id(name, nis)")
      .eq("date", date)
      .order("created_at", { ascending: true }),
    supabase
      .from("attendance_records")
      .select("*")
      .gte("date", start)
      .lte("date", end),
  ]);

  const students = ((studentsRes.data ?? []) as Pick<
    Profile,
    "id" | "name" | "nis"
  >[]).map((s) => ({ id: s.id, name: s.name, nis: s.nis }));

  const dayRecords = (dayRes.data ?? []) as AttendanceRecord[];
  const monthRecords = (monthRes.data ?? []) as AttendanceRecord[];

  const schoolDays = countSchoolDays(start, end);
  const summary = summarize(students, monthRecords, schoolDays);

  return (
    <AbsensiClient
      students={students}
      date={date}
      month={month}
      dayRecords={dayRecords}
      summary={summary}
      schoolDays={schoolDays}
      canWrite={canWrite}
      loadError={studentsRes.error?.message ?? dayRes.error?.message ?? null}
    />
  );
}
