import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { DashboardNav } from "./DashboardNav";
import {
  ROLE_LABEL,
  canAccessPengumuman,
  canView,
  type AppRole,
} from "@/lib/roles";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; show: boolean };

export function DashboardShell({
  user,
  children,
}: {
  user: { name?: string | null; role: AppRole; email?: string | null };
  children: ReactNode;
}) {
  const role = user.role;
  const items: NavItem[] = [
    { href: "/dashboard", label: "Ringkasan", show: true },
    { href: "/dashboard/saya", label: "Data saya", show: true },
    { href: "/dashboard/kas", label: "Kas", show: canView(role, "kas") },
    {
      href: "/dashboard/pengumuman",
      label: "Pengumuman",
      show: canAccessPengumuman(role),
    },
    {
      href: "/dashboard/pengurus",
      label: "Pengurus",
      show: canView(role, "pengurus"),
    },
    {
      href: "/dashboard/piket/kebersihan",
      label: "Piket kebersihan",
      show: canView(role, "piket-kebersihan"),
    },
    {
      href: "/dashboard/keamanan",
      label: "Keamanan",
      show: canView(role, "keamanan"),
    },
    {
      href: "/dashboard/jadwal",
      label: canView(role, "jadwal") ? "Edit jadwal" : "Jadwal",
      show: canView(role, "jadwal"),
    },
    {
      href: "/dashboard/galeri",
      label: "Kelola galeri",
      show: canView(role, "galeri"),
    },
    {
      href: "/dashboard/absensi",
      label: "Absensi",
      show: canView(role, "absensi"),
    },
    {
      href: "/dashboard/materi",
      label: "Materi",
      show: canView(role, "materi"),
    },
    {
      href: "/jadwal",
      label: "Jadwal (preview)",
      // Role tanpa edit jadwal: akses preview publik dari nav
      show: !canView(role, "jadwal"),
    },
  ].filter((i) => i.show);

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center">
              <Image
                src="/icon.png"
                alt="X-Finitys"
                width={32}
                height={32}
                className="size-8 rounded-md object-cover"
              />
            </Link>
            <div>
              <p className="text-sm font-semibold leading-tight">Dashboard</p>
              <p className="text-xs text-muted">
                {user.name} · {ROLE_LABEL[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/jadwal"
              className="gummy-btn gummy-btn-secondary h-8 rounded-md px-3 text-xs sm:text-sm"
            >
              <span>Situs publik</span>
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
        <DashboardNav items={items.map(({ href, label }) => ({ href, label }))} />
      </header>
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
