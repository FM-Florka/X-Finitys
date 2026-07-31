import type { ReactNode } from "react";
import { PublicNav } from "./PublicNav";

export function PublicShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: string;
}) {
  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <PublicNav active={active} />

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        X-Finitys · Pusat informasi kelas
      </footer>
    </div>
  );
}
