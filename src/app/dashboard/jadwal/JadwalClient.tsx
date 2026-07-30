"use client";

import {
  deleteScheduleSlot,
  upsertScheduleSlot,
} from "@/app/actions/jadwal";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MAX_PERIOD, MIN_PERIOD, SCHEDULE_DAYS } from "@/lib/schedule";
import type { ScheduleSlot } from "@/lib/types";
import { dayName } from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Draft = {
  id?: string;
  dayOfWeek: number;
  period: number;
  subject: string;
  teacher: string;
  room: string;
  /** true jika sel sudah terisi & form akan menimpa */
  replacing?: boolean;
};

export function JadwalClient({ slots }: { slots: ScheduleSlot[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cellTaken = (dayOfWeek: number, period: number, exceptId?: string) =>
    slots.some(
      (s) =>
        s.day_of_week === dayOfWeek &&
        s.period === period &&
        s.id !== exceptId,
    );

  const openAdd = (dayOfWeek: number, period: number) => {
    setError(null);
    // Klik sel kosong → sel itu free; tetap cek jaga-jaga
    setDraft({
      dayOfWeek,
      period,
      subject: "",
      teacher: "",
      room: "",
      replacing: cellTaken(dayOfWeek, period),
    });
  };

  const openEdit = (slot: ScheduleSlot) => {
    setError(null);
    setDraft({
      id: slot.id,
      dayOfWeek: slot.day_of_week,
      period: slot.period,
      subject: slot.subject,
      teacher: slot.teacher ?? "",
      room: slot.room ?? "",
      replacing: false,
    });
  };

  const openBlank = () => {
    setError(null);
    const dayOfWeek = 1;
    const period = 1;
    setDraft({
      dayOfWeek,
      period,
      subject: "",
      teacher: "",
      room: "",
      replacing: cellTaken(dayOfWeek, period),
    });
  };

  const close = () => {
    if (pending) return;
    setDraft(null);
    setError(null);
  };

  const onDayOrPeriodChange = (next: Partial<Draft>) => {
    if (!draft) return;
    const dayOfWeek = next.dayOfWeek ?? draft.dayOfWeek;
    const period = next.period ?? draft.period;
    setDraft({
      ...draft,
      ...next,
      dayOfWeek,
      period,
      // Tambah ke sel terisi, atau edit pindah ke sel lain yang terisi → timpa
      replacing: cellTaken(dayOfWeek, period, draft.id),
    });
  };

  const save = () => {
    if (!draft) return;
    const subject = draft.subject.trim();
    if (!subject) {
      setError("Mapel wajib diisi");
      return;
    }
    setError(null);
    const fd = new FormData();
    if (draft.id) fd.set("id", draft.id);
    fd.set("dayOfWeek", String(draft.dayOfWeek));
    fd.set("period", String(draft.period));
    fd.set("subject", subject);
    fd.set("teacher", draft.teacher.trim());
    fd.set("room", draft.room.trim());

    startTransition(async () => {
      try {
        await upsertScheduleSlot(fd);
        setDraft(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  };

  const remove = (slot: ScheduleSlot) => {
    if (
      !window.confirm(
        `Hapus ${slot.subject} · ${dayName(slot.day_of_week)} jam ke-${slot.period}?`,
      )
    ) {
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("id", slot.id);
    startTransition(async () => {
      try {
        await deleteScheduleSlot(fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menghapus");
      }
    });
  };

  const isEdit = Boolean(draft?.id);
  const modalTitle = isEdit ? "Edit slot" : "Tambah slot";
  const modalDesc = draft
    ? `${dayName(draft.dayOfWeek)} · Jam ke-${draft.period}`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Edit jadwal pelajaran
          </h1>
          <p className="mt-2 text-sm text-muted">
            Klik sel kosong untuk menambah, klik mapel untuk mengedit. Satu
            hari + jam ke- hanya boleh satu mapel (slot bentrok diganti).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={openBlank}>
            <Plus className="size-3.5" aria-hidden />
            Tambah slot
          </Button>
          <ButtonLink href="/jadwal" variant="secondary" size="sm">
            Preview publik
            <ChevronRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>

      {error && !draft ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {error}
        </p>
      ) : null}

      <Card padded={false} className="overflow-hidden">
        <ScheduleGrid
          slots={slots}
          mode="edit"
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={remove}
          emptyMessage="Belum ada slot. Klik + di sel untuk mengisi."
        />
      </Card>

      <Modal
        open={draft != null}
        onClose={close}
        title={modalTitle}
        description={modalDesc}
      >
        {draft ? (
          <div className="space-y-4">
            {draft.replacing ? (
              <p className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning-fg)]">
                Sel ini sudah terisi. Menyimpan akan{" "}
                <strong>mengganti</strong> mapel yang ada.
              </p>
            ) : null}

            {error ? (
              <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
                {error}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Hari" htmlFor="slot-day">
                <Select
                  id="slot-day"
                  value={draft.dayOfWeek}
                  disabled={pending}
                  onChange={(e) =>
                    onDayOrPeriodChange({
                      dayOfWeek: Number(e.target.value),
                    })
                  }
                >
                  {SCHEDULE_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {dayName(d)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Jam ke-" htmlFor="slot-period">
                <Select
                  id="slot-period"
                  value={draft.period}
                  disabled={pending}
                  onChange={(e) =>
                    onDayOrPeriodChange({
                      period: Number(e.target.value),
                    })
                  }
                >
                  {Array.from(
                    { length: MAX_PERIOD - MIN_PERIOD + 1 },
                    (_, i) => MIN_PERIOD + i,
                  ).map((p) => (
                    <option key={p} value={p}>
                      Jam ke-{p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mapel" htmlFor="slot-subject" className="sm:col-span-2">
                <Input
                  id="slot-subject"
                  value={draft.subject}
                  disabled={pending}
                  required
                  placeholder="Contoh: Matematika"
                  autoFocus
                  onChange={(e) =>
                    setDraft({ ...draft, subject: e.target.value })
                  }
                />
              </Field>
              <Field label="Guru" htmlFor="slot-teacher">
                <Input
                  id="slot-teacher"
                  value={draft.teacher}
                  disabled={pending}
                  placeholder="Opsional"
                  onChange={(e) =>
                    setDraft({ ...draft, teacher: e.target.value })
                  }
                />
              </Field>
              <Field label="Ruang" htmlFor="slot-room">
                <Input
                  id="slot-room"
                  value={draft.room}
                  disabled={pending}
                  placeholder="Opsional"
                  onChange={(e) =>
                    setDraft({ ...draft, room: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              {isEdit && draft.id ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    const slot = slots.find((s) => s.id === draft.id);
                    if (slot) {
                      setDraft(null);
                      remove(slot);
                    }
                  }}
                >
                  Hapus
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={close}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={save}
                >
                  {pending ? "Menyimpan…" : isEdit ? "Simpan" : "Tambah"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
