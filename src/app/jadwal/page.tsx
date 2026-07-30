import Link from "next/link";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { getProfile } from "@/lib/auth-helpers";
import { PIKET_DAYS, parseMembers } from "@/lib/piket";
import { canEdit } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { PiketCheck, PiketGroup, PiketTaskDef, ScheduleSlot } from "@/lib/types";
import { cn, dayName, formatDate, todaySchoolDay } from "@/lib/utils";
import { Check, Pencil, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jadwal" };

export default async function JadwalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "piket" ? "piket" : "pelajaran";
  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = todaySchoolDay();
  const profile = await getProfile();
  const canEditJadwal = canEdit(profile?.role, "jadwal");

  const [slotsRes, groupsRes, tasksRes, checksRes] = await Promise.all([
    supabase
      .from("schedule_slots")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("period", { ascending: true }),
    supabase
      .from("piket_groups")
      .select("*")
      .eq("section", "kebersihan")
      .order("day_of_week", { ascending: true }),
    supabase
      .from("piket_task_defs")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("piket_checks").select("*").eq("date", todayStr),
  ]);

  const slots = (slotsRes.data ?? []) as ScheduleSlot[];
  const groups = (groupsRes.data ?? []) as PiketGroup[];
  const tasks = (tasksRes.data ?? []) as PiketTaskDef[];
  const checks = (checksRes.data ?? []) as PiketCheck[];

  const tasksByGroup = new Map<string, PiketTaskDef[]>();
  for (const t of tasks) {
    const list = tasksByGroup.get(t.group_id) ?? [];
    list.push(t);
    tasksByGroup.set(t.group_id, list);
  }

  const checksByGroup = new Map<string, PiketCheck[]>();
  for (const c of checks) {
    const list = checksByGroup.get(c.group_id) ?? [];
    list.push(c);
    checksByGroup.set(c.group_id, list);
  }

  return (
    <PublicShell active="/jadwal">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Jadwal
            </h1>
            <Badge tone="muted">Preview read-only</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Pelajaran mingguan dan jadwal piket tetap per hari. Tanpa tombol
            edit — ubah lewat dashboard.
          </p>
        </div>
        {canEditJadwal ? (
          <ButtonLink href="/dashboard/jadwal" size="sm">
            <Pencil className="size-3.5" aria-hidden />
            Mode edit
          </ButtonLink>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <Link
          href="/jadwal"
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition",
            activeTab === "pelajaran"
              ? "bg-accent-soft text-accent-fg"
              : "bg-muted-bg text-muted hover:text-foreground",
          )}
        >
          Jadwal Pelajaran
        </Link>
        <Link
          href="/jadwal?tab=piket"
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition",
            activeTab === "piket"
              ? "bg-accent-soft text-accent-fg"
              : "bg-muted-bg text-muted hover:text-foreground",
          )}
        >
          Jadwal Piket
        </Link>
      </div>

      {activeTab === "pelajaran" ? (
        <Card padded={false} className="overflow-hidden">
          <ScheduleGrid
            slots={slots}
            mode="preview"
            emptyMessage="Jadwal kosong — belum diisi pengurus."
          />
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Piket kebersihan</CardTitle>
              <CardDesc>Jadwal tetap Senin–Jumat · bukan rotasi</CardDesc>
            </div>
            <Badge className="inline-flex items-center gap-1">
              <Sparkles className="size-3" aria-hidden />
              5 hari
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {(() => {
              const sectionGroups = PIKET_DAYS.map((d) => {
                const g = groups.find(
                  (x) => x.section === "kebersihan" && x.day_of_week === d,
                );
                return { day: d, group: g ?? null };
              });
              if (sectionGroups.every((x) => !x.group)) {
                return <Empty title="Belum ada jadwal" />;
              }
              return sectionGroups.map(({ day, group: g }) => {
                if (!g) {
                  return (
                    <div key={day} className="row-soft p-4">
                      <p className="font-medium">{dayName(day)}</p>
                      <p className="mt-1 text-sm text-muted">
                        Slot belum dibuat
                      </p>
                    </div>
                  );
                }
                const members = parseMembers(g.members);
                const dayTasks = tasksByGroup.get(g.id) ?? [];
                const gChecks = checksByGroup.get(g.id) ?? [];
                const checkMap = new Map(
                  gChecks.map((c) => [c.task_label, c]),
                );
                const isToday = day === today;
                const done = dayTasks.filter(
                  (t) => checkMap.get(t.task_label)?.done,
                ).length;

                return (
                  <div
                    key={g.id}
                    className={cn(
                      "row-soft p-4",
                      isToday &&
                        "border border-accent/30 bg-accent-soft/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{dayName(day)}</p>
                      {isToday ? <Badge>Hari ini</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {members.length > 0
                        ? members.join(", ")
                        : "Anggota belum diisi"}
                    </p>
                    {isToday && dayTasks.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted">
                          Checklist hari ini ({done}/{dayTasks.length}) ·{" "}
                          {formatDate(new Date())}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {dayTasks.map((t) => {
                            const c = checkMap.get(t.task_label);
                            const isDone = Boolean(c?.done);
                            return (
                              <li
                                key={t.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span
                                  className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-md text-xs",
                                    isDone
                                      ? "bg-accent text-white"
                                      : "border border-border bg-surface text-muted",
                                  )}
                                >
                                  {isDone ? (
                                    <Check className="size-3" aria-hidden />
                                  ) : (
                                    <span className="text-[10px]">·</span>
                                  )}
                                </span>
                                {t.task_label}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : dayTasks.length > 0 ? (
                      <p className="mt-2 text-xs text-muted">
                        {dayTasks.length} tugas template
                      </p>
                    ) : null}
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      )}
    </PublicShell>
  );
}
