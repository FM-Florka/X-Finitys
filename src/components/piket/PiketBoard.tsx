"use client";

import {
  addPiketTask,
  deletePiketTask,
  togglePiketCheck,
  updatePiketMembers,
} from "@/app/actions/piket";
import { AnnouncementForm } from "@/app/dashboard/pengumuman/AnnouncementForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  formatMembers,
  parseMembers,
  type PiketDayGroup,
} from "@/lib/piket";
import type { PiketSection } from "@/lib/types";
import { cn, dayName, todaySchoolDay } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type StudentOption = { id: string; name: string };

export function PiketBoard({
  section,
  groups,
  students,
  editable,
  canWarn,
}: {
  section: PiketSection;
  groups: PiketDayGroup[];
  students: StudentOption[];
  editable: boolean;
  canWarn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [membersGroup, setMembersGroup] = useState<PiketDayGroup | null>(null);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  const [taskGroup, setTaskGroup] = useState<PiketDayGroup | null>(null);
  const [taskLabel, setTaskLabel] = useState("");

  const [warnGroup, setWarnGroup] = useState<PiketDayGroup | null>(null);

  const today = todaySchoolDay();
  const sectionLabel =
    section === "kebersihan" ? "Piket kebersihan" : "Piket";

  const openMembers = (g: PiketDayGroup) => {
    setError(null);
    setMembersGroup(g);
    setSelectedNames(new Set(parseMembers(g.members)));
  };

  const toggleName = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const saveMembers = () => {
    if (!membersGroup) return;
    setError(null);
    const fd = new FormData();
    fd.set("section", section);
    fd.set("groupId", membersGroup.id);
    for (const n of selectedNames) fd.append("members", n);

    startTransition(async () => {
      try {
        await updatePiketMembers(fd);
        setMembersGroup(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal simpan anggota");
      }
    });
  };

  const saveTask = () => {
    if (!taskGroup) return;
    const label = taskLabel.trim();
    if (!label) {
      setError("Nama tugas wajib");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("section", section);
    fd.set("groupId", taskGroup.id);
    fd.set("taskLabel", label);

    startTransition(async () => {
      try {
        await addPiketTask(fd);
        setTaskGroup(null);
        setTaskLabel("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal tambah tugas");
      }
    });
  };

  const removeTask = (taskId: string, label: string) => {
    if (!window.confirm(`Hapus tugas “${label}”?`)) return;
    setError(null);
    const fd = new FormData();
    fd.set("section", section);
    fd.set("taskId", taskId);

    startTransition(async () => {
      try {
        await deletePiketTask(fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal hapus tugas");
      }
    });
  };

  const toggleTask = (g: PiketDayGroup, taskLabel: string) => {
    const st = g.checksToday[taskLabel];
    setError(null);
    const fd = new FormData();
    fd.set("section", section);
    fd.set("groupId", g.id);
    fd.set("taskLabel", taskLabel);
    fd.set("done", String(Boolean(st?.done)));
    if (st?.id) fd.set("id", st.id);

    startTransition(async () => {
      try {
        await togglePiketCheck(fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal update checklist");
      }
    });
  };

  const warnStudents = useMemo(() => {
    if (!warnGroup) return students;
    const memberNames = parseMembers(warnGroup.members);
    if (memberNames.length === 0) return students;
    const lower = new Set(memberNames.map((n) => n.toLowerCase()));
    const fromClass = students.filter((s) => lower.has(s.name.toLowerCase()));
    // include free-text names not in profiles
    const known = new Set(fromClass.map((s) => s.name.toLowerCase()));
    const extras = memberNames
      .filter((n) => !known.has(n.toLowerCase()))
      .map((n, i) => ({ id: `extra-${i}`, name: n }));
    return [...fromClass, ...extras];
  }, [warnGroup, students]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {sectionLabel}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Jadwal tetap Senin–Jumat · anggota tidak rotasi · checklist template
          per hari
        </p>
      </div>

      {error && !membersGroup && !taskGroup ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const isToday = g.day_of_week === today;
          const memberList = parseMembers(g.members);
          const doneCount = g.tasks.filter(
            (t) => g.checksToday[t.task_label]?.done,
          ).length;

          return (
            <Card
              key={g.id}
              className={cn(
                isToday && "border-accent/40 bg-accent-soft/20",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{dayName(g.day_of_week)}</CardTitle>
                  <CardDesc>
                    {g.tasks.length === 0
                      ? "Belum ada template tugas"
                      : `${doneCount}/${g.tasks.length} selesai hari ini`}
                  </CardDesc>
                </div>
                {isToday ? <Badge>Hari ini</Badge> : null}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                    <Users className="size-3" aria-hidden />
                    Anggota
                  </p>
                  {editable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => openMembers(g)}
                    >
                      <Pencil className="size-3" aria-hidden />
                      Edit
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm leading-snug">
                  {memberList.length > 0 ? (
                    memberList.join(", ")
                  ) : (
                    <span className="text-muted">Belum diisi</span>
                  )}
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {g.tasks.length === 0 ? (
                  <li className="text-sm text-muted">Belum ada tugas.</li>
                ) : (
                  g.tasks.map((t) => {
                    const st = g.checksToday[t.task_label];
                    const done = Boolean(st?.done);
                    return (
                      <li
                        key={t.id}
                        className="row-soft flex items-center justify-between gap-2 p-3"
                      >
                        <span
                          className={cn(
                            "text-sm font-medium",
                            done && "text-muted line-through",
                          )}
                        >
                          {t.task_label}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {editable ? (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => toggleTask(g, t.task_label)}
                                className={
                                  done
                                    ? "rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white"
                                    : "rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-accent/40 hover:text-accent-fg"
                                }
                              >
                                {done ? (
                                  <span className="inline-flex items-center gap-1">
                                    Selesai
                                    <Check className="size-3" aria-hidden />
                                  </span>
                                ) : (
                                  "Tandai selesai"
                                )}
                              </button>
                              <button
                                type="button"
                                title="Hapus tugas"
                                aria-label={`Hapus ${t.task_label}`}
                                disabled={pending}
                                onClick={() => removeTask(t.id, t.task_label)}
                                className="rounded-md border border-border p-1 text-muted hover:border-[var(--danger)]/40 hover:bg-[var(--danger-soft)] hover:text-[var(--danger-fg)]"
                              >
                                <Trash2 className="size-3" aria-hidden />
                              </button>
                            </>
                          ) : (
                            <Badge tone={done ? "accent" : "warning"}>
                              {done ? "Selesai" : "Belum"}
                            </Badge>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                {editable ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      setTaskLabel("");
                      setTaskGroup(g);
                    }}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Tambah tugas
                  </Button>
                ) : null}
                {canWarn ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      setWarnGroup(g);
                    }}
                  >
                    <AlertTriangle className="size-3.5" aria-hidden />
                    Beri Peringatan
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit anggota */}
      <Modal
        open={membersGroup != null}
        onClose={() => {
          if (pending) return;
          setMembersGroup(null);
          setError(null);
        }}
        title="Edit anggota"
        description={
          membersGroup
            ? `${dayName(membersGroup.day_of_week)} · ${sectionLabel}`
            : undefined
        }
      >
        {membersGroup ? (
          <div className="space-y-4">
            {error ? (
              <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
                {error}
              </p>
            ) : null}
            <p className="text-xs text-muted">
              Pilih siswa yang piket di hari ini setiap minggu (bukan rotasi).
            </p>
            {students.length === 0 ? (
              <p className="text-sm text-muted">
                Belum ada siswa terdaftar di profiles.
              </p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {students.map((s) => {
                  const checked = selectedNames.has(s.name);
                  return (
                    <li key={s.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
                          checked
                            ? "bg-accent-soft text-accent-fg"
                            : "hover:bg-muted-bg",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-3.5 accent-[var(--accent)]"
                          checked={checked}
                          disabled={pending}
                          onChange={() => toggleName(s.name)}
                        />
                        <span className="font-medium">{s.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs text-muted">
              Terpilih:{" "}
              {selectedNames.size > 0
                ? formatMembers([...selectedNames])
                : "—"}
            </p>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => setMembersGroup(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={saveMembers}
              >
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Tambah tugas */}
      <Modal
        open={taskGroup != null}
        onClose={() => {
          if (pending) return;
          setTaskGroup(null);
          setTaskLabel("");
          setError(null);
        }}
        title="Tambah tugas"
        description={
          taskGroup
            ? `Template tetap · ${dayName(taskGroup.day_of_week)}`
            : undefined
        }
      >
        {taskGroup ? (
          <div className="space-y-4">
            {error ? (
              <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
                {error}
              </p>
            ) : null}
            <Field label="Nama tugas" htmlFor="piket-task-label">
              <Input
                id="piket-task-label"
                value={taskLabel}
                disabled={pending}
                autoFocus
                placeholder={
                  section === "kebersihan"
                    ? "Contoh: Sapu lantai"
                    : "Contoh: Kunci pintu"
                }
                onChange={(e) => setTaskLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveTask();
                  }
                }}
              />
            </Field>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => setTaskGroup(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={saveTask}
              >
                {pending ? "Menyimpan…" : "Tambah"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Beri peringatan */}
      <Modal
        open={warnGroup != null}
        onClose={() => setWarnGroup(null)}
        title="Beri Peringatan"
        description={
          warnGroup
            ? `Piket ${dayName(warnGroup.day_of_week)} · pilih siswa & isi pelanggaran`
            : undefined
        }
      >
        {warnGroup ? (
          <AnnouncementForm
            mode="peringatan"
            students={warnStudents}
            onClose={() => {
              setWarnGroup(null);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
