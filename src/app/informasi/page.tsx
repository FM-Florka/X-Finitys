import { PublicShell } from "@/components/layout/PublicShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import {
  CATEGORY_LABEL,
  CATEGORY_TONE,
  deadlineChipClass,
  deadlineLabel,
  deadlineStatus,
  isPeringatan,
  isTugas,
} from "@/lib/announcements";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, AnnouncementCategory } from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { AlertTriangle, BookOpen, CalendarDays, ClipboardList, Pin } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Informasi" };

const CATEGORIES = [
  { key: "all", label: "Semua" },
  { key: "akademik", label: "Akademik" },
  { key: "acara", label: "Acara" },
  { key: "piket", label: "Piket" },
  { key: "kas", label: "Kas" },
  { key: "umum", label: "Umum" },
  { key: "tugas", label: "Tugas" },
  { key: "peringatan", label: "Peringatan" },
] as const;

export default async function InformasiPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const active =
    CATEGORIES.find((c) => c.key === kategori)?.key ?? "all";

  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("*, author:profiles!author_id(name, role)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (active !== "all") {
    query = query.eq("category", active);
  }

  const { data } = await query;
  const items = (data ?? []) as Announcement[];

  return (
    <PublicShell active="/informasi">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Informasi & Kegiatan
        </h1>
        <p className="mt-1 text-sm text-muted">
          Feed pengumuman & tugas kelas — terbaru di atas. Peringatan piket
          ditandai tegas; tugas menampilkan deadline.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={c.key === "all" ? "/informasi" : `/informasi?kategori=${c.key}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active === c.key
                ? c.key === "peringatan"
                  ? "bg-[var(--danger-soft)] text-[var(--danger-fg)]"
                  : c.key === "tugas"
                    ? "bg-[var(--warning-soft)] text-[var(--warning-fg)]"
                    : "bg-accent-soft text-accent-fg"
                : "bg-muted-bg text-muted hover:text-foreground",
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Empty
          title="Belum ada informasi"
          description="Coba filter lain atau cek lagi nanti."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const warning = isPeringatan(item.category);
            const task = isTugas(item.category);
            const label =
              CATEGORY_LABEL[item.category as AnnouncementCategory] ??
              item.category;
            const dlStatus = task ? deadlineStatus(item.event_date) : null;
            const dlText = task ? deadlineLabel(item.event_date) : null;

            return (
              <Card
                key={item.id}
                className={cn(
                  warning &&
                    "border-[var(--danger)]/35 bg-[var(--danger-soft)]/40 ring-1 ring-[var(--danger)]/15",
                  task &&
                    dlStatus === "overdue" &&
                    "border-[var(--danger)]/25 bg-[var(--danger-soft)]/20",
                  task &&
                    dlStatus === "soon" &&
                    "border-[var(--warning)]/30 bg-[var(--warning-soft)]/25",
                )}
              >
                {task ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <Badge tone="muted">
                          <span className="inline-flex items-center gap-1">
                            <ClipboardList className="size-3" aria-hidden />
                            {label}
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
                      </div>
                      {item.event_date ? (
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-semibold tracking-tight",
                            deadlineChipClass(dlStatus),
                          )}
                        >
                          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                          {dlStatus === "overdue"
                            ? dlText ?? "Terlambat"
                            : dlStatus === "soon"
                              ? `${dlText ?? "Mendesak"} · ${formatDate(item.event_date)}`
                              : `Deadline ${formatDate(item.event_date)}`}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                      <span className="inline-flex items-start gap-2">
                        <ClipboardList
                          className="mt-1 size-5 shrink-0 text-muted"
                          aria-hidden
                        />
                        {item.title}
                      </span>
                    </h2>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          CATEGORY_TONE[item.category as AnnouncementCategory] ??
                          "muted"
                        }
                      >
                        {warning ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="size-3" aria-hidden />
                            {label}
                          </span>
                        ) : (
                          label
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
                        <Badge tone={warning ? "danger" : "muted"}>
                          {warning ? "Kejadian" : "Event"}{" "}
                          {formatDate(item.event_date)}
                        </Badge>
                      ) : null}
                    </div>
                    <h2
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
                    </h2>
                  </>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
                <p className="mt-3 text-xs text-muted">
                  {item.author?.name ?? "—"} · {formatDateTime(item.created_at)}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </PublicShell>
  );
}
