"use client";

import {
  createIncident,
  deleteIncident,
} from "@/app/actions/keamanan";
import { AnnouncementForm } from "@/app/dashboard/pengumuman/AnnouncementForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { IncidentLog } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type StudentOption = { id: string; name: string };

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function KeamananClient({
  incidents,
  students,
  canWrite,
  canWarn,
}: {
  incidents: IncidentLog[];
  students: StudentOption[];
  canWrite: boolean;
  canWarn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [warnFor, setWarnFor] = useState<IncidentLog | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studentName, setStudentName] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    toLocalInputValue(new Date()),
  );

  const studentOptions = useMemo(
    () => [
      { value: "", label: "— Tidak spesifik —" },
      ...students.map((s) => ({ value: s.name, label: s.name })),
    ],
    [students],
  );

  const warnStudents = useMemo(() => {
    if (!warnFor?.student_name?.trim()) return students;
    const name = warnFor.student_name.trim();
    if (students.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return students;
    }
    return [{ id: "from-log", name }, ...students];
  }, [warnFor, students]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStudentName("");
    setOccurredAt(toLocalInputValue(new Date()));
    setError(null);
  };

  const openForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const save = () => {
    if (!title.trim() || !description.trim()) {
      setError("Judul dan detail wajib diisi");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("description", description.trim());
    if (studentName.trim()) fd.set("studentName", studentName.trim());
    fd.set("occurredAt", occurredAt);

    startTransition(async () => {
      try {
        await createIncident(fd);
        setFormOpen(false);
        resetForm();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan log");
      }
    });
  };

  const remove = (item: IncidentLog) => {
    if (!window.confirm(`Hapus log “${item.title}”?`)) return;
    setError(null);
    const fd = new FormData();
    fd.set("id", item.id);
    startTransition(async () => {
      try {
        await deleteIncident(fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menghapus");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Keamanan
          </h1>
          <p className="mt-2 text-sm text-muted">
            Log kejadian & masalah kelas — internal pengurus (bukan feed
            publik). Satu petugas keamanan memantau situasi, bukan checklist
            harian.
          </p>
        </div>
        {canWrite ? (
          <Button type="button" size="sm" onClick={openForm} disabled={pending}>
            <Plus className="size-3.5" aria-hidden />
            Catat kejadian
          </Button>
        ) : null}
      </div>

      {error && !formOpen ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {error}
        </p>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Log kejadian</CardTitle>
            <CardDesc>
              {incidents.length === 0
                ? "Belum ada catatan"
                : `${incidents.length} entri · terbaru di atas`}
            </CardDesc>
          </div>
          <Badge tone="muted">Internal</Badge>
        </div>

        <ul className="mt-4 space-y-2">
          {incidents.length === 0 ? (
            <li className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              Belum ada log.{" "}
              {canWrite
                ? "Klik “Catat kejadian” untuk menambah."
                : "Hanya pengurus keamanan yang bisa menulis."}
            </li>
          ) : (
            incidents.map((item) => (
              <li key={item.id} className="row-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold leading-snug">{item.title}</p>
                      {item.student_name ? (
                        <Badge tone="warning">{item.student_name}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {formatDateTime(item.occurred_at || item.created_at)}
                      {item.author?.name ? ` · ${item.author.name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {canWarn ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => setWarnFor(item)}
                      >
                        <AlertTriangle className="size-3.5" aria-hidden />
                        Beri Peringatan
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <button
                        type="button"
                        title="Hapus log"
                        aria-label={`Hapus ${item.title}`}
                        disabled={pending}
                        onClick={() => remove(item)}
                        className="rounded-md border border-border p-1.5 text-muted hover:border-[var(--danger)]/40 hover:bg-[var(--danger-soft)] hover:text-[var(--danger-fg)]"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => {
          if (pending) return;
          setFormOpen(false);
          setError(null);
        }}
        title="Catat kejadian"
        description="Detail disimpan internal — tidak muncul di informasi publik."
      >
        <div className="space-y-4">
          {error ? (
            <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
              {error}
            </p>
          ) : null}
          <Field label="Judul / ringkasan" htmlFor="inc-title">
            <Input
              id="inc-title"
              value={title}
              disabled={pending}
              required
              autoFocus
              placeholder="Contoh: Barang hilang di kelas"
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Detail kejadian" htmlFor="inc-desc">
            <Textarea
              id="inc-desc"
              value={description}
              disabled={pending}
              required
              rows={4}
              placeholder="Kronologi, lokasi, tindakan yang sudah diambil…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Siswa terlibat (opsional)" htmlFor="inc-student">
            <Select
              id="inc-student"
              options={studentOptions}
              value={studentName}
              onChange={setStudentName}
              placeholder="— Tidak spesifik —"
              disabled={pending}
            />
          </Field>
          <Field label="Tanggal & waktu" htmlFor="inc-when">
            <Input
              id="inc-when"
              type="datetime-local"
              value={occurredAt}
              disabled={pending}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setFormOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              loading={pending}
              onClick={save}
            >
              {pending ? "Menyimpan…" : "Simpan log"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={warnFor != null}
        onClose={() => setWarnFor(null)}
        title="Beri Peringatan"
        description={
          warnFor
            ? `Dari log: ${warnFor.title}`
            : undefined
        }
      >
        {warnFor ? (
          <AnnouncementForm
            mode="peringatan"
            students={warnStudents}
            defaultStudentName={warnFor.student_name ?? undefined}
            defaultViolation={warnFor.description}
            onClose={() => {
              setWarnFor(null);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
