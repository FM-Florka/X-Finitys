import { PiketBoard } from "@/components/piket/PiketBoard";
import { requireView } from "@/lib/auth-helpers";
import {
  buildPiketDayGroups,
  ensurePiketDays,
} from "@/lib/piket";
import { canCreatePeringatan, canEdit } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { PiketCheck, PiketTaskDef, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piket kebersihan" };

export default async function PiketKebersihanPage() {
  const profile = await requireView("piket-kebersihan");
  const editable = canEdit(profile.role, "piket-kebersihan");
  const canWarn = canCreatePeringatan(profile.role);
  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const groups = await ensurePiketDays(supabase, "kebersihan");
  const groupIds = groups.map((g) => g.id);

  const [tasksRes, checksRes, studentsRes] = await Promise.all([
    groupIds.length
      ? supabase
          .from("piket_task_defs")
          .select("*")
          .in("group_id", groupIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as PiketTaskDef[] }),
    groupIds.length
      ? supabase
          .from("piket_checks")
          .select("id, group_id, task_label, done")
          .eq("date", todayStr)
          .in("group_id", groupIds)
      : Promise.resolve({ data: [] as Pick<PiketCheck, "id" | "group_id" | "task_label" | "done">[] }),
    supabase
      .from("profiles")
      .select("id, name")
      .neq("role", "guru")
      .order("name", { ascending: true }),
  ]);

  const dayGroups = buildPiketDayGroups(
    groups,
    (tasksRes.data ?? []) as PiketTaskDef[],
    (checksRes.data ?? []) as Pick<
      PiketCheck,
      "id" | "group_id" | "task_label" | "done"
    >[],
  );

  const students = (
    (studentsRes.data ?? []) as Pick<Profile, "id" | "name">[]
  ).map((s) => ({ id: s.id, name: s.name }));

  return (
    <PiketBoard
      section="kebersihan"
      groups={dayGroups}
      students={students}
      editable={editable}
      canWarn={canWarn}
    />
  );
}
