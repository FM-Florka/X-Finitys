import { KeamananClient } from "@/app/dashboard/keamanan/KeamananClient";
import { requireView } from "@/lib/auth-helpers";
import { canCreatePeringatan, canEdit } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { IncidentLog, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keamanan" };

export default async function KeamananPage() {
  const profile = await requireView("keamanan");
  const canWrite = canEdit(profile.role, "keamanan");
  const canWarn = canCreatePeringatan(profile.role);
  const supabase = await createClient();

  const [incidentsRes, studentsRes] = await Promise.all([
    supabase
      .from("incident_logs")
      .select("*, author:profiles!author_id(name)")
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id, name")
      .neq("role", "guru")
      .order("name", { ascending: true }),
  ]);

  // Fallback sort if occurred_at column belum dimigrasi
  let incidents = (incidentsRes.data ?? []) as IncidentLog[];
  if (incidentsRes.error) {
    const { data } = await supabase
      .from("incident_logs")
      .select("*, author:profiles!author_id(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    incidents = ((data ?? []) as IncidentLog[]).map((i) => ({
      ...i,
      occurred_at: i.occurred_at ?? i.created_at,
      student_name: i.student_name ?? null,
    }));
  } else {
    incidents = incidents.map((i) => ({
      ...i,
      occurred_at: i.occurred_at ?? i.created_at,
      student_name: i.student_name ?? null,
    }));
  }

  const students = (
    (studentsRes.data ?? []) as Pick<Profile, "id" | "name">[]
  ).map((s) => ({ id: s.id, name: s.name }));

  return (
    <KeamananClient
      incidents={incidents}
      students={students}
      canWrite={canWrite}
      canWarn={canWarn}
    />
  );
}
