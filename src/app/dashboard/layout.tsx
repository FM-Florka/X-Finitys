import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireProfile } from "@/lib/auth-helpers";
import type { AppRole } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <DashboardShell
      user={{
        name: profile.name,
        email: profile.email,
        role: profile.role as AppRole,
      }}
    >
      {children}
    </DashboardShell>
  );
}
