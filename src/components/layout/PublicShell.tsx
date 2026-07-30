import type { ReactNode } from "react";
import Link from "next/link";
import { PublicNav } from "./PublicNav";

export function PublicShell({
  children,
  active,
  hero,
}: {
  children: ReactNode;
  active?: string;
  /** When set: full-viewport spring card with XF logo + hero (home only). */
  hero?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col bg-background">
      {hero ? (
        <div className="relative isolate flex min-h-svh flex-col overflow-hidden rounded-b-xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/spring.jfif)" }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/45" aria-hidden />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="flex items-center px-4 py-3 sm:px-6 sm:py-4">
              <Link
                href="/"
                className="inline-flex items-baseline font-bold leading-none tracking-tight text-white"
                aria-label="XF Hub"
              >
                <span className="text-xl sm:text-2xl">X</span>
                <span className="text-sm text-accent sm:text-base">F</span>
              </Link>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">{hero}</div>
          </div>
        </div>
      ) : (
        <PublicNav active={active} />
      )}

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        XF Hub · Pusat informasi kelas
      </footer>
    </div>
  );
}
