"use client";

import { createAnnouncement } from "@/app/actions/announcements";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CATEGORY_OPTIONS } from "@/lib/announcements";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type StudentOption = { id: string; name: string };

export function AnnouncementForm({
  onClose,
  mode = "full",
  students = [],
  defaultStudentName,
  defaultViolation,
}: {
  onClose?: () => void;
  /** full = semua kategori; peringatan = form teguran piket saja */
  mode?: "full" | "peringatan";
  students?: StudentOption[];
  /** Prefill nama siswa (shortcut dari log keamanan / piket). */
  defaultStudentName?: string;
  defaultViolation?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(
    mode === "peringatan" ? "peringatan" : "umum",
  );
  const [studentName, setStudentName] = useState(defaultStudentName ?? "");

  const isPeringatan = mode === "peringatan" || category === "peringatan";
  const isTugas = mode === "full" && category === "tugas";

  const studentOptions = useMemo(() => {
    const opts = students.map((s) => ({
      value: s.name,
      label: s.name,
    }));
    const pref = defaultStudentName?.trim();
    if (
      pref &&
      !opts.some((o) => o.value.toLowerCase() === pref.toLowerCase())
    ) {
      opts.unshift({ value: pref, label: pref });
    }
    return opts;
  }, [students, defaultStudentName]);

  const categoryOptions =
    mode === "peringatan"
      ? CATEGORY_OPTIONS.filter((c) => c.value === "peringatan")
      : CATEGORY_OPTIONS;

  return (
    <form
      action={(fd) => {
        setError(null);
        if (isPeringatan) {
          fd.set("category", "peringatan");
        }
        startTransition(async () => {
          try {
            await createAnnouncement(fd);
            onClose?.();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal menyimpan");
          }
        });
      }}
      className="space-y-2.5 sm:space-y-3.5"
    >
      {mode === "full" ? (
        <Field label="Kategori" htmlFor="category">
          <Select
            id="category"
            name="category"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
          />
        </Field>
      ) : (
        <input type="hidden" name="category" value="peringatan" />
      )}

      {isPeringatan ? (
        <>
          <Field label="Nama siswa" htmlFor="studentName">
            {studentOptions.length > 0 ? (
              <Select
                id="studentName"
                name="studentName"
                required
                placeholder="Pilih siswa…"
                options={studentOptions}
                value={studentName}
                onChange={setStudentName}
              />
            ) : (
              <Input
                id="studentName"
                name="studentName"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nama siswa yang ditegur"
              />
            )}
          </Field>
          <Field label="Keterangan pelanggaran" htmlFor="violation">
            <Textarea
              id="violation"
              name="violation"
              required
              defaultValue={defaultViolation}
              placeholder="Contoh: tidak menutup pintu saat pulang"
              rows={2}
            />
          </Field>
          <Field label="Tanggal kejadian (opsional)" htmlFor="incidentDate">
            <DatePicker id="incidentDate" name="incidentDate" />
          </Field>
          {mode === "full" ? (
            <Checkbox name="pinned" label="Sematkan di atas" />
          ) : null}
        </>
      ) : isTugas ? (
        <>
          <Field label="Judul tugas" htmlFor="title">
            <Input
              id="title"
              name="title"
              required
              placeholder="Contoh: Latihan soal bab 3"
            />
          </Field>
          <Field label="Keterangan / detail tugas" htmlFor="body">
            <Textarea
              id="body"
              name="body"
              required
              placeholder="Instruksi, halaman, atau link…"
              rows={3}
            />
          </Field>
          <Field label="Mata pelajaran (opsional)" htmlFor="subject">
            <Input
              id="subject"
              name="subject"
              placeholder="Contoh: Matematika"
            />
          </Field>
          <Field label="Deadline (wajib)" htmlFor="eventDate">
            <DatePicker id="eventDate" name="eventDate" />
          </Field>
          <Checkbox name="pinned" label="Sematkan di atas" />
        </>
      ) : (
        <>
          <Field label="Judul" htmlFor="title">
            <Input
              id="title"
              name="title"
              required
              placeholder="Judul pengumuman"
            />
          </Field>
          <Field label="Isi" htmlFor="body">
            <Textarea
              id="body"
              name="body"
              required
              placeholder="Detail pengumuman…"
              rows={2}
            />
          </Field>
          <Field label="Tanggal event" htmlFor="eventDate">
            <DatePicker id="eventDate" name="eventDate" />
          </Field>
          <Checkbox name="pinned" label="Sematkan di atas" />
        </>
      )}

      {error ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-2.5 py-1.5 text-xs text-[var(--danger-fg)] sm:px-3 sm:py-2 sm:text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 sm:pt-4">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="flex-1 sm:h-9 sm:flex-none sm:px-3.5 sm:text-sm"
        >
          {pending
            ? "Menyimpan…"
            : isPeringatan
              ? "Catat peringatan"
              : isTugas
                ? "Publikasikan tugas"
                : "Publikasikan"}
        </Button>
        {onClose ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={pending}
            className="sm:h-9 sm:px-3.5 sm:text-sm"
          >
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );
}
