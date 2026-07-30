import { createClient } from "@/lib/supabase/server";

const BUCKET = "gallery";

export function publicStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function uploadGalleryFile(file: File, folder = "uploads") {
  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Hapus objek storage (abaikan path kosong). Gagal → throw. */
export async function deleteGalleryFiles(paths: Array<string | null | undefined>) {
  const clean = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (clean.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove(clean);
  if (error) throw error;
}
