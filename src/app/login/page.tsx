import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth-helpers";
import { dashboardHome } from "@/lib/roles";
import { LoginForm } from "./LoginForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Jangan auto-redirect kalau ada error (hindari loop session orphan).
  if (!error) {
    const profile = await getProfile();
    if (profile) redirect(dashboardHome(profile.role));
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold"
          >
            <span className="inline-flex items-baseline font-bold leading-none tracking-tight">
              <span className="text-2xl">X</span>
              <span className="text-base text-accent">F</span>
            </span>
            XF Hub
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Masuk</h1>
          <p className="mt-1 text-sm text-muted">
            Dashboard siswa, pengurus, dan guru
          </p>
        </div>
        <div className="surface p-6 sm:p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <div className="mt-6 rounded-md border border-border bg-muted-bg p-3 text-xs text-muted">
            <p className="font-medium text-foreground">Akun demo</p>
            <p className="mt-1">
              Password semua: <code>password123</code>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Setup: jalankan SQL{" "}
              <code className="text-foreground">002_profiles_bootstrap.sql</code>
              , seed user{" "}
              <code className="text-foreground">npm run db:seed-users</code>
              (butuh service role key).
            </p>
            <ul className="mt-2 space-y-0.5">
              <li>ketua@xf.local</li>
              <li>bendahara@xf.local</li>
              <li>keamanan@xf.local · kebersihan@xf.local</li>
              <li>guru@xf.local · siswa1@xf.local</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-medium text-accent-deep hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
