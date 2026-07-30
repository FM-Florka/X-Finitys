import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/layout/PublicShell";
import { Empty } from "@/components/ui/Empty";
import { createClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/storage";
import type { Album, Photo } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("albums")
    .select("*, photos(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const album = data as Album & { photos: Photo[] };
  const photos = [...(album.photos ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <PublicShell active="/galeri">
      <Link
        href="/galeri"
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-deep hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Kembali ke galeri
      </Link>
      <div className="mt-3 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {album.title}
        </h1>
        {album.description ? (
          <p className="mt-1 text-muted">{album.description}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted">
          {formatDate(album.event_date ?? album.created_at)}
        </p>
      </div>

      {photos.length === 0 ? (
        <Empty title="Album kosong" description="Belum ada foto diunggah." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const url = publicStorageUrl(photo.storage_path);
            return (
              <figure key={photo.id} className="surface overflow-hidden">
                <div className="relative aspect-square bg-muted-bg">
                  {url ? (
                    <Image
                      src={url}
                      alt={photo.caption ?? album.title}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 33vw"
                      unoptimized
                    />
                  ) : null}
                </div>
                {photo.caption ? (
                  <figcaption className="p-3 text-sm text-muted">
                    {photo.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>
      )}
    </PublicShell>
  );
}
