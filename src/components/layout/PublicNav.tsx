import Link from "next/link";
import Image from "next/image";
import { getProfile } from "@/lib/auth-helpers";
import { dashboardHome } from "@/lib/roles";
import { cn } from "@/lib/utils";

const links = [
  { href: "/jadwal", label: "Jadwal" },
  { href: "/galeri", label: "Galeri" },
  { href: "/informasi", label: "Informasi" },
];

export async function PublicNav({
  active,
  variant = "default",
}: {
  active?: string;
  variant?: "default" | "overlay";
}) {
  const profile = await getProfile();
  const overlay = variant === "overlay";

  return (
    <header
      className={cn(
        "z-40",
        overlay
          ? "relative border-b border-white/10 bg-transparent"
          : "sticky top-0 border-b border-border bg-background/80 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/jadwal"
          className={cn(
            "flex items-center gap-2 font-semibold tracking-tight",
            overlay && "text-white",
          )}
        >
          <Image
            src="/icon.png"
            alt="X-Finitys"
            width={28}
            height={28}
            className="size-7 rounded-md object-cover"
          />
          <span className="hidden sm:inline">X-Finitys</span>
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto sm:gap-1.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
                active === l.href
                  ? overlay
                    ? "bg-white/15 text-white"
                    : "bg-accent-soft text-accent-fg"
                  : overlay
                    ? "text-white/70 hover:bg-white/10 hover:text-white"
                    : "text-muted hover:bg-muted-bg hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {profile ? (
            <Link
              href={dashboardHome(profile.role)}
              className="gummy-btn gummy-btn-primary h-9 rounded-md px-3.5 text-sm"
            >
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={cn(
                "gummy-btn h-9 rounded-md px-3.5 text-sm",
                overlay
                  ? "gummy-btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/15"
                  : "gummy-btn-secondary",
              )}
            >
              <span>Masuk</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
