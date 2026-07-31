"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAbsence, markAbsent } from "@/app/actions/absensi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  ATTENDANCE_LABEL,
  ATTENDANCE_STATUSES,
  attendanceTone,
  formatMonthLabel,
  listRecentMonthKeys,
} from "@/lib/absensi";
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, Trash2, UserPlus } from "lucide-react";

type Student = { id: string; name: string; nis: string | null };

export function AbsensiClient({
  students,
  date,
  month,
  dayRecords,
  summary,
  schoolDays,
  canWrite,
  loadError,
}: {
  students: Student[];
  date: string;
  month: string;
  dayRecords: AttendanceRecord[];
  summary: AttendanceSummary[];
  schoolDays: number;
  canWrite: boolean;
  loadError: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"harian" | "rekap">("harian");
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const absentIds = useMemo(
    () => new Set(dayRecords.map((r) => r.user_id)),
    [dayRecords],
  );

  const presentCount = Math.max(0, students.length - dayRecords.length);

  const studentOptions = useMemo(
    () =>
      students
        .filter((s) => !absentIds.has(s.id))
        .map((s) => ({ value: s.id, label: s.name })),
    [students, absentIds],
  );

  const monthOptions = useMemo(
    () =>
      listRecentMonthKeys(month, 12).map((m) => ({
        value: m,
        label: formatMonthLabel(m),
      })),
    [month],
  );

  function setParam(key: string, value: string) {
    const params = new URLSearchParams({ date, month });
    params.set(key, value);
    router.push(`/dashboard/absensi?${params.toString()}`);
  }

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await markAbsent(formData);
      setFormOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan absensi");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    try {
      await clearAbsence(fd);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus entri");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Absensi</h1>
          <p className="mt-1 text-sm text-muted">
            Hanya siswa yang tidak hadir dicatat. Sisanya dihitung hadir.
          </p>
        </div>
        {canWrite && tab === "harian" ? (
          <Button onClick={() => setFormOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            Tandai tidak hadir
          </Button>
        ) : null}
      </div>

      {loadError ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          Gagal memuat data: {loadError}. Pastikan migration{" "}
          <code>014_attendance_materials.sql</code> sudah dijalankan.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]"
        >
          {error}
        </p>
      ) : null}

      <nav className="flex gap-1 border-b border-border">
        {(["harian", "rekap"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            }`}
          >
            {t === "harian" ? "Per hari" : "Rekap bulanan"}
          </button>
        ))}
      </nav>

      {tab === "harian" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Field label="Tanggal" htmlFor="date" className="w-44">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setParam("date", e.target.value)}
              />
            </Field>
            <div className="flex gap-2 pt-5">
              <Badge tone="accent">{presentCount} hadir</Badge>
              <Badge tone="muted">{dayRecords.length} tidak hadir</Badge>
            </div>
          </div>

          <Card padded={false}>
            <div className="border-b border-border px-5 py-4">
              <CardTitle>Tidak hadir · {formatDate(date)}</CardTitle>
              <CardDesc>
                {students.length} siswa terdaftar. Yang tidak tercatat di sini
                dianggap hadir.
              </CardDesc>
            </div>
            {dayRecords.length === 0 ? (
              <Empty
                title="Semua hadir"
                description="Belum ada siswa yang ditandai tidak hadir pada tanggal ini."
                className="m-5"
              />
            ) : (
              <ul className="divide-y divide-border">
                {dayRecords.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {r.profile?.name ?? "—"}
                      </p>
                      {r.note ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {r.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={attendanceTone(r.status)}>
                        {ATTENDANCE_LABEL[r.status]}
                      </Badge>
                      {canWrite ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(r.id)}
                          aria-label={`Hapus entri ${r.profile?.name ?? ""}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Bulan" htmlFor="month" className="w-56">
              <Select
                id="month"
                options={monthOptions}
                value={month}
                onChange={(v) => setParam("month", v)}
              />
            </Field>
            <div className="flex items-center gap-1.5 pt-5 text-sm text-muted">
              <CalendarDays className="size-4" aria-hidden />
              {schoolDays} hari sekolah
            </div>
          </div>

          <Card padded={false}>
            <div className="border-b border-border px-5 py-4">
              <CardTitle>Rekap · {formatMonthLabel(month)}</CardTitle>
              <CardDesc>
                Urut dari alfa terbanyak. Hadir = hari sekolah − total absen,
                belum memperhitungkan hari libur.
              </CardDesc>
            </div>
            {summary.length === 0 ? (
              <Empty title="Belum ada data" className="m-5" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Nama</th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Hadir
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Sakit
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Izin
                      </th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Alfa
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.map((s) => (
                      <tr key={s.user_id}>
                        <td className="px-5 py-2.5">{s.name}</td>
                        <td className="px-3 py-2.5 text-right text-muted">
                          {s.hadir}
                        </td>
                        <td className="px-3 py-2.5 text-right">{s.sakit}</td>
                        <td className="px-3 py-2.5 text-right">{s.izin}</td>
                        <td className="px-5 py-2.5 text-right">
                          {s.alfa > 0 ? (
                            <span className="font-medium text-[var(--danger-fg)]">
                              {s.alfa}
                            </span>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Tandai tidak hadir"
        description={`Tanggal ${formatDate(date)}`}
      >
        <form action={submit} className="space-y-4">
          <input type="hidden" name="date" value={date} />
          <Field label="Siswa" htmlFor="userId">
            <Select
              id="userId"
              name="userId"
              options={studentOptions}
              placeholder="Pilih siswa…"
              required
            />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              name="status"
              options={ATTENDANCE_STATUSES.map((s: AttendanceStatus) => ({
                value: s,
                label: ATTENDANCE_LABEL[s],
              }))}
              defaultValue="alfa"
              required
            />
          </Field>
          <Field label="Keterangan (opsional)" htmlFor="note">
            <Input id="note" name="note" placeholder="Misal: surat dokter" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
