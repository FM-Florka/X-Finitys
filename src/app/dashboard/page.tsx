import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { requireProfile } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessPengumuman,
  canEdit,
  canView,
  ROLE_LABEL,
} from "@/lib/roles";
import type {
  Announcement,
  AppRole,
  ClassMeta,
  PiketGroup,
} from "@/lib/types";
import {
  deadlineLabel,
  deadlineStatus,
  deadlineTone,
  isPeringatan,
  isTugas,
} from "@/lib/announcements";
import { dayName, formatRp, formatDate, todaySchoolDay } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const day = todaySchoolDay();
  const schoolDay = day >= 1 && day <= 5 ? day : null;

  const canSeeKeamanan = canView(profile.role as AppRole, "keamanan");

  const [
    metaRes,
    announcementsRes,
    incomeRes,
    expenseRes,
    kebersihanRes,
    incidentCountRes,
    studentsRes,
  ] = await Promise.all([
    supabase.from("class_meta").select("*").eq("id", "main").maybeSingle(),
    supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("transactions").select("amount").eq("type", "pemasukan"),
    supabase.from("transactions").select("amount").eq("type", "pengeluaran"),
    schoolDay
      ? supabase
          .from("piket_groups")
          .select("*")
          .eq("section", "kebersihan")
          .eq("day_of_week", schoolDay)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    canSeeKeamanan
      ? supabase
          .from("incident_logs")
          .select("*", { count: "exact", head: true })
      : Promise.resolve({ count: null }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .neq("role", "guru"),
  ]);

  const meta = metaRes.data as ClassMeta | null;
  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const income = (incomeRes.data ?? []).reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0,
  );
  const expense = (expenseRes.data ?? []).reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0,
  );
  const kebersihan = kebersihanRes.data as PiketGroup | null;
  const incidentCount = incidentCountRes.count ?? 0;
  const students = studentsRes.count ?? 0;
  const saldo = income - expense;
  const role = profile.role as AppRole;

  const quickLinks = [
    { href: "/dashboard/saya", label: "Status bayar saya", show: true },
    {
      href: "/dashboard/kas",
      label: "Modul kas",
      show: canView(role, "kas"),
    },
    {
      href: "/dashboard/pengumuman",
      label: "Pengumuman",
      show: canAccessPengumuman(role),
    },
    {
      href: "/dashboard/keamanan",
      label: "Keamanan",
      show: canView(role, "keamanan"),
    },
    {
      href: "/dashboard/piket/kebersihan",
      label: "Piket kebersihan",
      show: canView(role, "piket-kebersihan"),
    },
    {
      href: "/dashboard/jadwal",
      label: "Edit jadwal",
      show: canEdit(role, "jadwal"),
    },
    { href: "/jadwal", label: "Jadwal (preview)", show: true },
    { href: "/galeri", label: "Galeri publik", show: true },
    { href: "/informasi", label: "Feed informasi", show: true },
  ].filter((x) => x.show);

  return (
    <div className="space-y-12">
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Halo, {profile.name?.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Masuk sebagai <Badge>{ROLE_LABEL[role]}</Badge>
        </p>
      </div>

      {/* Asymmetric metrics: hero saldo + side stack */}
      <section className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Card
          variant="hero"
          className="flex min-h-[200px] flex-col justify-between p-6 sm:p-8 lg:col-span-7 lg:min-h-[260px] lg:row-span-2"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Saldo kas kelas
            </p>
            <p
              className={`mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl ${
                saldo >= 0 ? "text-accent-deep" : "text-[var(--danger)]"
              }`}
            >
              {formatRp(saldo)}
            </p>
            <p className="mt-3 text-sm text-muted">
              Pemasukan {formatRp(income)} · Pengeluaran {formatRp(expense)}
            </p>
          </div>
          {canView(role, "kas") ? (
            <div className="mt-8">
              <ButtonLink href="/dashboard/kas" variant="primary" size="md">
                {canEdit(role, "kas") ? "Kelola kas" : "Lihat laporan"}
                <ChevronRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          ) : null}
        </Card>

        <Card
          variant="metric"
          className="flex flex-col justify-between p-5 sm:p-6 lg:col-span-5"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Siswa terdata
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {students}
          </p>
          <p className="mt-2 text-xs text-muted">
            Meta kelas: {meta?.student_count ?? "—"} orang
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-5">
          <Card variant="metric" className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Piket kebersihan
              {schoolDay ? ` · ${dayName(schoolDay)}` : ""}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl line-clamp-2">
              {schoolDay
                ? kebersihan?.members?.trim()
                  ? kebersihan.members
                  : "Belum diisi"
                : "Akhir pekan"}
            </p>
          </Card>
          {canSeeKeamanan ? (
            <Card variant="metric" className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Log keamanan
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                {incidentCount} entri
              </p>
              <p className="mt-1 text-xs text-muted">Internal pengurus</p>
            </Card>
          ) : (
            <Card variant="metric" className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Hari ini
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                {schoolDay ? dayName(schoolDay) : "Akhir pekan"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatDate(new Date())}
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* Akses cepat wider + pengumuman */}
      <section className="grid gap-5 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Akses cepat</CardTitle>
              <CardDesc>Shortcut yang sering dipakai</CardDesc>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {quickLinks.map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="row-soft flex items-center justify-between px-4 py-3 text-sm font-medium transition hover:border-border hover:bg-[var(--surface)]"
              >
                <span>{x.label}</span>
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-5">
          <CardTitle className="text-base">Pengumuman terbaru</CardTitle>
          <CardDesc>Update kelas</CardDesc>
          <ul className="mt-4 space-y-2">
            {announcements.length === 0 ? (
              <li className="row-soft p-3 text-sm text-muted">
                Belum ada pengumuman.
              </li>
            ) : (
              announcements.map((a) => {
                const warning = isPeringatan(a.category);
                const task = isTugas(a.category);
                const dlStatus = task ? deadlineStatus(a.event_date) : null;
                const dlText = task ? deadlineLabel(a.event_date) : null;
                return (
                  <li
                    key={a.id}
                    className="border-b border-border py-3 last:border-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">
                        {a.title}
                      </p>
                      {warning ? (
                        <Badge tone="danger">Peringatan</Badge>
                      ) : task ? (
                        <Badge tone={deadlineTone(dlStatus)}>
                          {dlStatus === "overdue"
                            ? dlText ?? "Terlambat"
                            : dlStatus === "soon"
                              ? dlText ?? "Tugas"
                              : "Tugas"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(a.created_at)}
                    </p>
                  </li>
                );
              })
            )}
          </ul>
          {canAccessPengumuman(role) ? (
            <div className="mt-5">
              <ButtonLink
                href="/dashboard/pengumuman"
                size="sm"
                variant="secondary"
              >
                {canEdit(role, "pengumuman")
                  ? "Kelola pengumuman"
                  : "Buka pengumuman"}
                <ChevronRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
