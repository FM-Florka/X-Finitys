import { PengumumanClient } from "@/app/dashboard/pengumuman/PengumumanClient";
import { requireView } from "@/lib/auth-helpers";
import {
  canCreatePeringatan,
  canEditPengumuman,
  canResetTaskSubmission,
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, Profile, TaskSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengumuman" };

export default async function PengumumanDashPage() {
  const profile = await requireView("pengumuman");
  const fullEditor = canEditPengumuman(profile.role);
  const canWritePeringatan = canCreatePeringatan(profile.role);
  const canResetSubmission = canResetTaskSubmission(profile.role);
  const supabase = await createClient();

  const [annRes, studentsRes, mySubRes, allSubRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("*, author:profiles!author_id(name)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, name")
      .neq("role", "guru")
      .order("name", { ascending: true }),
    supabase
      .from("task_submissions")
      .select("announcement_id, submitted")
      .eq("user_id", profile.id)
      .eq("submitted", true),
    supabase
      .from("task_submissions")
      .select("announcement_id")
      .eq("submitted", true),
  ]);

  const items = (annRes.data ?? []) as Announcement[];
  const students = (
    (studentsRes.data ?? []) as Pick<Profile, "id" | "name">[]
  ).map((s) => ({ id: s.id, name: s.name }));

  const mySubmissions: Record<string, boolean> = {};
  for (const row of (mySubRes.data ?? []) as Pick<
    TaskSubmission,
    "announcement_id" | "submitted"
  >[]) {
    if (row.submitted) mySubmissions[row.announcement_id] = true;
  }

  const submissionCounts: Record<string, number> = {};
  for (const row of (allSubRes.data ?? []) as Pick<
    TaskSubmission,
    "announcement_id"
  >[]) {
    submissionCounts[row.announcement_id] =
      (submissionCounts[row.announcement_id] ?? 0) + 1;
  }

  return (
    <PengumumanClient
      items={items}
      fullEditor={fullEditor}
      canWritePeringatan={canWritePeringatan}
      canResetSubmission={canResetSubmission}
      currentUserId={profile.id}
      students={students}
      mySubmissions={mySubmissions}
      submissionCounts={submissionCounts}
      studentCount={students.length}
    />
  );
}
