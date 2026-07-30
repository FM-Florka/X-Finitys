import Link from "next/link";
import { GalleryCoverflow } from "@/components/galeri/GalleryCoverflow";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import {
  deadlineLabel,
  deadlineStatus,
  deadlineTone,
  isPeringatan,
  isTugas,
} from "@/lib/announcements";
import { getProfile } from "@/lib/auth-helpers";
import { dashboardHome } from "@/lib/roles";
import { publicStorageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type {
  Announcement,
  ClassMeta,
  PiketGroup,
  ScheduleSlot,
} from "@/lib/types";
import { dayName, formatDate, todaySchoolDay } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Lock,
} from "lucide-react";

export const dynamic = "force-dynamic";

function LoginGateCard({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Card className={className ?? "p-6"}>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDesc>Khusus anggota kelas</CardDesc>
      <div className="mt-6 flex flex-col items-start gap-3 rounded-md border border-border bg-muted-bg/60 px-4 py-5">
        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted">
          <Lock className="size-4" aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        <ButtonLink href="/login" size="sm">
          Login untuk melihat
        </ButtonLink>
      </div>
    </Card>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const day = todaySchoolDay();
  const todayStr = new Date().toISOString().slice(0, 10);
  const schoolDay = day >= 1 && day <= 5 ? day : null;
  const loggedIn = Boolean(profile);

  const [
    metaRes,
    announcementsRes,
    eventsRes,
    kebersihanRes,
    todaySlotsRes,
    latestPhotosRes,
  ] = await Promise.all([
    supabase.from("class_meta").select("*").eq("id", "main").maybeSingle(),
    loggedIn
      ? supabase
          .from("announcements")
          .select("*, author:profiles!author_id(name)")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as Announcement[] }),
    loggedIn
      ? supabase
          .from("announcements")
          .select("*")
          .gte("event_date", todayStr)
          .order("event_date", { ascending: true })
          .limit(3)
      : Promise.resolve({ data: [] as Announcement[] }),
    loggedIn && schoolDay
      ? supabase
          .from("piket_groups")
          .select("*")
          .eq("section", "kebersihan")
          .eq("day_of_week", schoolDay)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    schoolDay
      ? supabase
          .from("schedule_slots")
          .select("*")
          .eq("day_of_week", schoolDay)
          .order("period", { ascending: true })
      : Promise.resolve({ data: [] as ScheduleSlot[] }),
    supabase
      .from("photos")
      .select("id, storage_path, caption, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const meta = metaRes.data as ClassMeta | null;
  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const events = (eventsRes.data ?? []) as Announcement[];
  const kebersihan = kebersihanRes.data as PiketGroup | null;
  const todaySlots = (todaySlotsRes.data ?? []) as ScheduleSlot[];
  const coverflowPhotos = (latestPhotosRes.data ?? [])
    .map((p) => {
      const row = p as {
        id: string;
        storage_path: string;
        caption: string | null;
      };
      const url = publicStorageUrl(row.storage_path);
      if (!url) return null;
      return {
        id: row.id,
        url,
        caption: row.caption,
      };
    })
    .filter(
      (p): p is { id: string; url: string; caption: string | null } =>
        Boolean(p),
    );

  const heroDescription = (() => {
    const base =
      meta?.description?.trim() ||
      "Website resmi kelas X F SMAN 11 Pontianak. Tempat berbagi pengumuman, jadwal pelajaran, galeri kegiatan, dan administrasi kelas dalam satu portal. Dikelola bersama pengurus kelas agar informasi cepat sampai dan kegiatan lebih teratur.";
    if (meta?.motto) {
      return base + " Motto kami: “" + meta.motto + "”.";
    }
    if (meta?.description?.trim()) return base;
    return base + " Belajar, berorganisasi, dan tumbuh bersama.";
  })();

  return (
    <PublicShell
      active="/"
      hero={
        <div className="flex h-full flex-1 flex-col items-center justify-center px-6 pb-16 pt-4 text-center sm:px-10 sm:pb-20">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-white">X </span>
            <span className="text-accent">F</span>
            <span className="text-white">initys</span>
          </h1>

          <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-white sm:text-base">
            SMA NEGERI 11 PONTIANAK
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-[15px]">
            {heroDescription}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <ButtonLink
              href={profile ? dashboardHome(profile.role) : "/login"}
            >
              {profile ? "Dashboard" : "Login"}
            </ButtonLink>
            <ButtonLink href="/galeri" variant="secondary">
              Galeri
            </ButtonLink>
          </div>
        </div>
      }
    >
      <GalleryCoverflow photos={coverflowPhotos} />

      {/* Preview jadwal hari ini — publik */}
      <section className="mt-12">
        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Jadwal hari ini</CardTitle>
              <CardDesc>
                {schoolDay
                  ? `Preview singkat · ${dayName(schoolDay)}`
                  : "Hari libur / akhir pekan — tidak ada jam pelajaran"}
              </CardDesc>
            </div>
            <ButtonLink href="/jadwal" size="sm" variant="secondary">
              Lihat jadwal lengkap
              <ChevronRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          {!schoolDay ? (
            <p className="mt-4 text-sm text-muted">
              Cek grid Senin–Jumat di halaman jadwal.
            </p>
          ) : todaySlots.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Belum ada slot untuk hari ini.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {todaySlots.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-12 shrink-0 text-xs font-medium text-muted">
                      Jam {s.period}
                    </span>
                    <span className="text-sm font-medium">{s.subject}</span>
                  </div>
                  <span className="text-xs text-muted">
                    {s.teacher ?? "—"}
                    {s.room ? ` · ${s.room}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-12 grid gap-4 lg:grid-cols-12">
        {loggedIn ? (
          <Card className="p-6 lg:col-span-5">
            <CardTitle className="text-base">Pengumuman terbaru</CardTitle>
            <CardDesc>Update dari ketua & guru</CardDesc>
            <ul className="mt-4 space-y-0">
              {announcements.length === 0 ? (
                <li className="text-sm text-muted">Belum ada pengumuman.</li>
              ) : (
                announcements.map((a) => {
                  const warning = isPeringatan(a.category);
                  const task = isTugas(a.category);
                  const dlStatus = task ? deadlineStatus(a.event_date) : null;
                  const dlText = task ? deadlineLabel(a.event_date) : null;
                  return (
                    <li
                      key={a.id}
                      className={`border-b border-border py-3.5 last:border-0 ${
                        warning
                          ? "rounded-md border border-[var(--danger)]/25 bg-[var(--danger-soft)]/50 px-2.5"
                          : task
                            ? "rounded-md border border-[var(--warning)]/20 bg-[var(--warning-soft)]/40 px-2.5"
                            : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            warning ? "text-[var(--danger-fg)]" : ""
                          }`}
                        >
                          {warning ? (
                            <span className="inline-flex items-start gap-1.5">
                              <AlertTriangle
                                className="mt-0.5 size-3.5 shrink-0 text-[var(--danger)]"
                                aria-hidden
                              />
                              {a.title}
                            </span>
                          ) : task ? (
                            <span className="inline-flex items-start gap-1.5">
                              <ClipboardList
                                className="mt-0.5 size-3.5 shrink-0 text-[var(--warning-fg)]"
                                aria-hidden
                              />
                              {a.title}
                            </span>
                          ) : (
                            a.title
                          )}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                          {a.pinned ? <Badge tone="warning">Pin</Badge> : null}
                          {warning ? (
                            <Badge tone="danger">Peringatan</Badge>
                          ) : null}
                          {task ? (
                            <Badge tone={deadlineTone(dlStatus)}>
                              {dlStatus === "overdue"
                                ? dlText ?? "Terlambat"
                                : dlStatus === "soon"
                                  ? dlText ?? "Mendesak"
                                  : a.event_date
                                    ? `DL ${formatDate(a.event_date)}`
                                    : "Tugas"}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {a.body}
                      </p>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="mt-5">
              <ButtonLink href="/informasi" size="sm" variant="secondary">
                Semua informasi
                <ChevronRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <LoginGateCard
            className="p-6 lg:col-span-5"
            title="Pengumuman terbaru"
            description="Login untuk melihat pengumuman kelas."
          />
        )}

        {loggedIn ? (
          <Card className="p-6 lg:col-span-4">
            <CardTitle className="text-base">Piket kebersihan</CardTitle>
            <CardDesc>
              {schoolDay
                ? `Regu tetap · ${dayName(schoolDay)}`
                : "Akhir pekan — tidak ada jadwal sekolah"}
            </CardDesc>
            <div className="mt-4">
              <div className="row-soft p-3.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Anggota hari ini
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {schoolDay
                    ? kebersihan?.members?.trim()
                      ? kebersihan.members
                      : "Belum diisi"
                    : "—"}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <ButtonLink href="/jadwal?tab=piket" size="sm" variant="secondary">
                Detail jadwal piket
                <ChevronRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <LoginGateCard
            className="p-6 lg:col-span-4"
            title="Piket kebersihan"
            description="Login untuk melihat regu piket kebersihan."
          />
        )}

        {loggedIn ? (
          <Card className="p-6 lg:col-span-3">
            <CardTitle className="text-base">Event</CardTitle>
            <CardDesc>Mendatang</CardDesc>
            <ul className="mt-4 space-y-3">
              {events.length === 0 ? (
                <li className="text-sm text-muted">Tidak ada event.</li>
              ) : (
                events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted-bg text-sm font-semibold">
                      {e.event_date ? new Date(e.event_date).getDate() : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-snug">{e.title}</p>
                      <p className="text-xs text-muted">
                        {formatDate(e.event_date)}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>
        ) : (
          <LoginGateCard
            className="p-6 lg:col-span-3"
            title="Event"
            description="Login untuk melihat event mendatang."
          />
        )}
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            href: "/jadwal",
            title: "Jadwal",
            desc: "Pelajaran & piket mingguan",
          },
          { href: "/galeri", title: "Galeri", desc: "Foto kegiatan per album" },
          {
            href: loggedIn ? "/informasi" : "/login",
            title: "Informasi",
            desc: loggedIn
              ? "Pengumuman & update kegiatan"
              : "Login untuk buka pengumuman",
          },
        ].map((item) => (
          <Link key={item.href + item.title} href={item.href} className="group">
            <Card className="h-full p-6 transition group-hover:border-[var(--border-strong)]">
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDesc>{item.desc}</CardDesc>
              <p className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-muted group-hover:text-accent-deep">
                Buka
                <ChevronRight className="size-4" aria-hidden />
              </p>
            </Card>
          </Link>
        ))}
      </section>
    </PublicShell>
  );
}
