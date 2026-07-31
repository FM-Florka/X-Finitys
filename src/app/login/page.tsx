import { Suspense } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getProfile } from "@/lib/auth-helpers";
import { dashboardHome } from "@/lib/roles";
import { LoginForm } from "./LoginForm";

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
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/icon.png"
            alt="X-Finitys"
            width={72}
            height={72}
            className="size-[72px] rounded-xl border border-border object-cover"
            priority
          />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            X-Finitys
          </h1>
          <p className="mt-1 text-sm text-muted">Masuk ke akun kelas Anda</p>
        </div>

        <div className="surface p-6 sm:p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
