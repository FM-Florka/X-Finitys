"use client";

import {
  deleteAnnouncement,
  resetTaskSubmission,
  submitTask,
  togglePin,
} from "@/app/actions/announcements";
import { AnnouncementForm } from "@/app/dashboard/pengumuman/AnnouncementForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  CATEGORY_LABEL,
  CATEGORY_TONE,
  deadlineChipClass,
  deadlineLabel,
  deadlineStatus,
  isPeringatan,
  isTugas,
  type DeadlineStatus,
} from "@/lib/announcements";
import type { Announcement, AnnouncementCategory } from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  Pin,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Item = Announcement;
type StudentOption = { id: string; name: string };

export function PengumumanClient({
  items,
  fullEditor,
  canWritePeringatan,
  canResetSubmission = false,
  currentUserId,
  students = [],
  /** announcement_id → sudah dikumpulkan oleh current user */
  mySubmissions = {},
  /** announcement_id → jumlah siswa yang sudah kumpul */
  submissionCounts = {},
  studentCount = 0,
}: {
  items: Item[];
  /** Boleh kelola semua kategori (pin, hapus semua, form penuh). */
  fullEditor: boolean;
  /** Boleh buat / hapus peringatan milik sendiri. */
  canWritePeringatan: boolean;
  /** Boleh batalkan status kumpul (ketua/wakil/guru). */
  canResetSubmission?: boolean;
  currentUserId: string;
  students?: StudentOption[];
  mySubmissions?: Record<string, boolean>;
  submissionCounts?: Record<string, number>;
  studentCount?: number;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | AnnouncementCategory>("all");
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const canWrite = fullEditor || canWritePeringatan;
  const formMode = fullEditor ? "full" : "peringatan";

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const stats = useMemo(() => {
    if (!fullEditor) return null;
    const total = items.length;
    const pinned = items.filter((i) => i.pinned).length;
    const warnings = items.filter((i) => i.category === "peringatan").length;
    const tasks = items.filter((i) => i.category === "tugas").length;
    const byCat = items.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {});
    const topCategory =
      Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { total, pinned, warnings, tasks, topCategory };
  }, [items, fullEditor]);

  const filters: { key: "all" | AnnouncementCategory; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "umum", label: "Umum" },
    { key: "akademik", label: "Akademik" },
    { key: "acara", label: "Acara" },
    { key: "piket", label: "Piket" },
    { key: "kas", label: "Kas" },
    { key: "tugas", label: "Tugas" },
    { key: "peringatan", label: "Peringatan" },
  ];

  const runAction = (action: (fd: FormData) => Promise<void>, fd: FormData) => {
    setActionError(null);
    startTransition(async () => {
      try {
        await action(fd);
        router.refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Gagal");
      }
    });
  };

  const canDeleteItem = (item: Item) => {
    if (fullEditor) return true;
    return (
      canWritePeringatan &&
      item.category === "peringatan" &&
      item.author_id === currentUserId
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {fullEditor
              ? "Pengumuman"
              : canWritePeringatan
                ? "Pengumuman & Peringatan"
                : "Pengumuman & Tugas"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {fullEditor
              ? "Kelola pengumuman & tugas kelas."
              : canWritePeringatan
                ? "Catat peringatan piket (nama siswa + pelanggaran)."
                : "Lihat pengumuman & centang tugas yang sudah dikumpulkan."}
          </p>
        </div>
        {canWrite ? (
          <Button type="button" onClick={() => setShowForm(true)}>
            <Plus className="size-4" aria-hidden />
            {formMode === "peringatan"
              ? "Catat peringatan"
              : "Tulis pengumuman"}
          </Button>
        ) : null}
      </div>

      {actionError ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {actionError}
        </p>
      ) : null}

      {fullEditor && stats ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="metric" className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Total
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-muted">Semua pengumuman</p>
          </Card>
          <Card variant="metric" className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Disematkan
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {stats.pinned}
            </p>
            <p className="mt-1 text-xs text-muted">Tampil di atas</p>
          </Card>
          <Card variant="metric" className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Tugas
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--warning-fg)]">
              {stats.tasks}
            </p>
            <p className="mt-1 text-xs text-muted">Dengan deadline</p>
          </Card>
          <Card variant="metric" className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Peringatan
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--danger)]">
              {stats.warnings}
            </p>
            <p className="mt-1 text-xs text-muted">
              Top:{" "}
              {stats.topCategory === "—"
                ? "—"
                : CATEGORY_LABEL[stats.topCategory as AnnouncementCategory] ??
                  stats.topCategory}
            </p>
          </Card>
        </section>
      ) : null}

      {canWrite ? (
        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title={
            formMode === "peringatan"
              ? "Catat peringatan piket"
              : "Tulis pengumuman"
          }
          description={
            formMode === "peringatan"
              ? "Teguran pelanggaran piket — tampil tegas di feed"
              : "Pilih kategori Tugas untuk deadline & status kumpul"
          }
        >
          <AnnouncementForm
            onClose={() => setShowForm(false)}
            mode={formMode}
            students={students}
          />
        </Modal>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              filter === f.key
                ? f.key === "peringatan"
                  ? "bg-[var(--danger-soft)] text-[var(--danger-fg)]"
                  : f.key === "tugas"
                    ? "bg-[var(--warning-soft)] text-[var(--warning-fg)]"
                    : "bg-accent-soft text-accent-fg"
                : "bg-muted-bg text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Daftar pengumuman
          </h2>
          <span className="text-xs text-muted">{filtered.length} item</span>
        </div>

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted-bg">
              <Megaphone className="size-5 text-muted" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium">Belum ada pengumuman</p>
              <p className="mt-1 text-xs text-muted">
                {canWrite
                  ? formMode === "peringatan"
                    ? "Klik “Catat peringatan” untuk membuat yang pertama."
                    : "Klik “Tulis pengumuman” untuk membuat yang pertama."
                  : "Belum ada yang dipublikasikan."}
              </p>
            </div>
            {canWrite ? (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="size-3.5" aria-hidden />
                {formMode === "peringatan"
                  ? "Catat peringatan"
                  : "Tulis pengumuman"}
              </Button>
            ) : null}
          </Card>
        ) : (
          filtered.map((item) => {
            const warning = isPeringatan(item.category);
            const task = isTugas(item.category);
            const dlStatus = task ? deadlineStatus(item.event_date) : null;
            const dlText = task ? deadlineLabel(item.event_date) : null;
            const submitted = Boolean(mySubmissions[item.id]);
            const count = submissionCounts[item.id] ?? 0;
            const progressPct =
              task && studentCount > 0
                ? Math.min(100, Math.round((count / studentCount) * 100))
                : 0;

            return (
              <Card
                key={item.id}
                className={cn(
                  "p-5 sm:p-6",
                  warning &&
                    "border-[var(--danger)]/35 bg-[var(--danger-soft)]/40 ring-1 ring-[var(--danger)]/15",
                  task &&
                    dlStatus === "overdue" &&
                    "border-[var(--danger)]/25 bg-[var(--danger-soft)]/20",
                  task &&
                    dlStatus === "soon" &&
                    "border-[var(--warning)]/30 bg-[var(--warning-soft)]/25",
                  task &&
                    dlStatus === "ok" &&
                    "border-border bg-muted-bg/30",
                )}
              >
                {task ? (
                  <TaskCardHeader
                    item={item}
                    dlStatus={dlStatus}
                    dlText={dlText}
                    submitted={submitted}
                    count={count}
                    studentCount={studentCount}
                    progressPct={progressPct}
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={CATEGORY_TONE[item.category] ?? "muted"}>
                        {warning ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="size-3" aria-hidden />
                            {CATEGORY_LABEL[item.category] ?? item.category}
                          </span>
                        ) : (
                          CATEGORY_LABEL[item.category] ?? item.category
                        )}
                      </Badge>
                      {item.pinned ? (
                        <Badge tone="muted">
                          <span className="inline-flex items-center gap-1">
                            <Pin className="size-3" aria-hidden />
                            Pin
                          </span>
                        </Badge>
                      ) : null}
                      {item.event_date ? (
                        <Badge tone={warning ? "danger" : "accent"}>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3" aria-hidden />
                            {formatDate(item.event_date)}
                          </span>
                        </Badge>
                      ) : null}
                    </div>
                    <h3
                      className={cn(
                        "mt-3 text-base font-semibold tracking-tight",
                        warning && "text-[var(--danger-fg)]",
                      )}
                    >
                      {warning ? (
                        <span className="inline-flex items-start gap-2">
                          <AlertTriangle
                            className="mt-0.5 size-4 shrink-0 text-[var(--danger)]"
                            aria-hidden
                          />
                          {item.title}
                        </span>
                      ) : (
                        item.title
                      )}
                    </h3>
                  </>
                )}

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
                <p className="mt-3 text-xs text-muted">
                  {item.author?.name ?? "—"} · {formatDateTime(item.created_at)}
                </p>

                {task ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    {submitted ? (
                      <>
                        <span
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-accent/25 bg-accent-soft px-3.5 text-sm font-medium text-accent-fg"
                          aria-label="Tugas sudah dikumpulkan"
                        >
                          <CheckCircle2 className="size-4" aria-hidden />
                          Terkumpul
                        </span>
                        {canResetSubmission ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={pending}
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("announcementId", item.id);
                              fd.set("userId", currentUserId);
                              runAction(resetTaskSubmission, fd);
                            }}
                          >
                            Batalkan (admin)
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">
                            Status final — hubungi pengurus jika salah centang
                          </span>
                        )}
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={pending}
                        className="min-w-[10.5rem]"
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("announcementId", item.id);
                          runAction(submitTask, fd);
                        }}
                      >
                        <Check className="size-4" aria-hidden />
                        Tandai terkumpul
                      </Button>
                    )}
                  </div>
                ) : null}

                {fullEditor || canDeleteItem(item) ? (
                  <div
                    className={cn(
                      "flex flex-wrap gap-2",
                      task
                        ? "mt-3"
                        : "mt-4 border-t border-border pt-4",
                    )}
                  >
                    {fullEditor ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("id", item.id);
                          fd.set("pinned", String(item.pinned));
                          runAction(togglePin, fd);
                        }}
                      >
                        <Pin className="size-3.5" aria-hidden />
                        {item.pinned ? "Lepas pin" : "Sematkan"}
                      </Button>
                    ) : null}
                    {canDeleteItem(item) ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("id", item.id);
                          runAction(deleteAnnouncement, fd);
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}

function TaskCardHeader({
  item,
  dlStatus,
  dlText,
  submitted,
  count,
  studentCount,
  progressPct,
}: {
  item: Item;
  dlStatus: DeadlineStatus | null;
  dlText: string | null;
  submitted: boolean;
  count: number;
  studentCount: number;
  progressPct: number;
}) {
  const deadlineDisplay =
    item.event_date == null
      ? null
      : dlStatus === "overdue"
        ? (dlText ?? "Terlambat")
        : dlStatus === "soon"
          ? `${dlText ?? "Mendesak"} · ${formatDate(item.event_date)}`
          : `Deadline ${formatDate(item.event_date)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Badge tone="muted">
            <span className="inline-flex items-center gap-1">
              <ClipboardList className="size-3" aria-hidden />
              Tugas
            </span>
          </Badge>
          {item.pinned ? (
            <Badge tone="muted">
              <span className="inline-flex items-center gap-1">
                <Pin className="size-3" aria-hidden />
                Pin
              </span>
            </Badge>
          ) : null}
          {item.subject ? (
            <Badge tone="muted">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3" aria-hidden />
                {item.subject}
              </span>
            </Badge>
          ) : null}
          {submitted ? (
            <Badge tone="accent">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" aria-hidden />
                Terkumpul
              </span>
            </Badge>
          ) : null}
        </div>

        {deadlineDisplay ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-semibold tracking-tight",
              deadlineChipClass(dlStatus),
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            {deadlineDisplay}
          </span>
        ) : null}
      </div>

      <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
        <span className="inline-flex items-start gap-2">
          <ClipboardList
            className="mt-1 size-5 shrink-0 text-muted"
            aria-hidden
          />
          {item.title}
        </span>
      </h3>

      {studentCount > 0 ? (
        <div
          className="w-full rounded-md border border-border bg-muted-bg/50 px-3 py-2.5"
          aria-label={`${count} dari ${studentCount} siswa dikumpulkan`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-muted">
              Dikumpulkan
            </p>
            <p className="text-base font-semibold tabular-nums tracking-tight leading-none sm:text-lg">
              {count}
              <span className="text-sm font-medium text-muted">
                /{studentCount}
              </span>
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                progressPct >= 100
                  ? "bg-accent"
                  : progressPct >= 50
                    ? "bg-[var(--warning)]"
                    : "bg-muted",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
