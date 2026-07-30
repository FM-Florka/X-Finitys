import { GaleriManager } from "@/components/galeri/GaleriManager";
import { requireView } from "@/lib/auth-helpers";
import { canEdit } from "@/lib/roles";
import { publicStorageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Album, Photo } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kelola galeri" };

export default async function GaleriDashPage() {
  const profile = await requireView("galeri");
  const editable = canEdit(profile.role, "galeri");
  const supabase = await createClient();

  const [{ data: albumRows }, { data: photoRows }] = await Promise.all([
    supabase
      .from("albums")
      .select("*, photos(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const albums = (albumRows ?? []).map((a) => {
    const row = a as Album & { photos?: { count: number }[] };
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      cover_path: row.cover_path,
      cover_url: publicStorageUrl(row.cover_path),
      event_date: row.event_date,
      created_at: row.created_at,
      photo_count: row.photos?.[0]?.count ?? 0,
    };
  });

  const photos = (photoRows ?? []).map((p) => {
    const row = p as Photo;
    return {
      id: row.id,
      album_id: row.album_id,
      storage_path: row.storage_path,
      caption: row.caption,
      created_at: row.created_at,
      url: publicStorageUrl(row.storage_path),
    };
  });

  return (
    <GaleriManager
      initialAlbums={albums}
      initialPhotos={photos}
      editable={editable}
    />
  );
}
