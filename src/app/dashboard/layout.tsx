import { headers } from "next/headers";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireProfile } from "@/lib/auth-helpers";
import type { AppRole } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const h = await headers();
  const pathname = h.get("x-pathname") ?? h.get("x-url") ?? "";

  return (
    <DashboardShell
      user={{
        name: profile.name,
        email: profile.email,
        role: profile.role as AppRole,
      }}
      active={pathname || undefined}
    >
      {children}
    </DashboardShell>
  );
}
