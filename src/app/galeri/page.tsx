import Image from "next/image";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import { createClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/storage";
import type { Album } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Galeri" };

export default async function GaleriPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("albums")
    .select("*, photos(count)")
    .order("created_at", { ascending: false });

  const albums = (data ?? []).map((a) => {
    const row = a as Album & { photos?: { count: number }[] };
    return {
      ...row,
      photo_count: row.photos?.[0]?.count ?? 0,
      cover_url: publicStorageUrl(row.cover_path),
    };
  });

  return (
    <PublicShell active="/galeri">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Galeri
        </h1>
        <p className="mt-1 text-sm text-muted">
          Foto kegiatan kelas, dikelompokkan per album/acara.
        </p>
      </div>

      {albums.length === 0 ? (
        <Empty
          title="Belum ada album"
          description="Pengurus bisa menambahkan album dari dashboard."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/galeri/${album.id}`}
              className="group surface overflow-hidden transition hover:border-[var(--border-strong)]"
            >
              <div className="relative aspect-[16/10] bg-muted-bg">
                {album.cover_url ? (
                  <Image
                    src={album.cover_url}
                    alt={album.title}
                    fill
                    className="object-cover transition group-hover:scale-[1.02]"
                    sizes="(max-width:768px) 100vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted opacity-50">
                    <ImageIcon className="size-10" aria-hidden />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">{album.title}</h2>
                  <Badge tone="muted">{album.photo_count} foto</Badge>
                </div>
                {album.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {album.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  {formatDate(album.event_date ?? album.created_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
