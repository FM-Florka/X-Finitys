"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEdit } from "@/lib/auth-helpers";
import {
  deleteGalleryFiles,
  publicStorageUrl,
  uploadGalleryFile,
} from "@/lib/storage";
import type { Album, Photo } from "@/lib/types";

function revalidateGallery(albumId?: string) {
  revalidatePath("/dashboard/galeri");
  revalidatePath("/galeri");
  if (albumId) revalidatePath(`/galeri/${albumId}`);
}

export type AlbumResult = Album & {
  cover_url: string | null;
  photo_count: number;
};

export type PhotoResult = Photo & {
  url: string | null;
};

export async function createAlbum(formData: FormData): Promise<AlbumResult> {
  const profile = await requireEdit("galeri");
  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const eventDateRaw = String(formData.get("eventDate") || "");
  const file = formData.get("cover") as File | null;

  if (!title) throw new Error("Judul wajib");

  let coverPath: string | null = null;
  if (file && file.size > 0) {
    coverPath = await uploadGalleryFile(file, "covers");
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      title,
      description,
      cover_path: coverPath,
      event_date: eventDateRaw || null,
      author_id: profile.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidateGallery();

  const album = data as Album;
  return {
    ...album,
    cover_url: publicStorageUrl(album.cover_path),
    photo_count: 0,
  };
}

export async function addPhoto(formData: FormData): Promise<PhotoResult> {
  const profile = await requireEdit("galeri");
  const supabase = await createClient();

  const albumId = String(formData.get("albumId") || "");
  const caption = String(formData.get("caption") || "").trim() || null;
  const file = formData.get("photo") as File | null;

  if (!albumId || !file || file.size === 0) {
    throw new Error("Album dan file foto wajib");
  }

  const storagePath = await uploadGalleryFile(file, `albums/${albumId}`);

  const { data, error } = await supabase
    .from("photos")
    .insert({
      album_id: albumId,
      storage_path: storagePath,
      caption,
      author_id: profile.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: album } = await supabase
    .from("albums")
    .select("cover_path")
    .eq("id", albumId)
    .maybeSingle();

  if (album && !album.cover_path) {
    await supabase
      .from("albums")
      .update({ cover_path: storagePath })
      .eq("id", albumId);
  }

  revalidateGallery(albumId);

  const photo = data as Photo;
  return {
    ...photo,
    url: publicStorageUrl(photo.storage_path),
  };
}

export async function updatePhotoCaption(formData: FormData): Promise<void> {
  await requireEdit("galeri");
  const supabase = await createClient();

  const photoId = String(formData.get("photoId") || "");
  const caption = String(formData.get("caption") || "").trim() || null;
  if (!photoId) throw new Error("Foto wajib");

  const { data: existing, error: fetchErr } = await supabase
    .from("photos")
    .select("id, album_id")
    .eq("id", photoId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) throw new Error("Foto tidak ditemukan");

  const { error } = await supabase
    .from("photos")
    .update({ caption })
    .eq("id", photoId);
  if (error) throw new Error(error.message);

  revalidateGallery(existing.album_id as string);
}

export async function deletePhoto(formData: FormData): Promise<void> {
  await requireEdit("galeri");
  const supabase = await createClient();

  const photoId = String(formData.get("photoId") || "");
  if (!photoId) throw new Error("Foto wajib");

  const { data: photo, error: fetchErr } = await supabase
    .from("photos")
    .select("id, album_id, storage_path")
    .eq("id", photoId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!photo) throw new Error("Foto tidak ditemukan");

  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);

  try {
    await deleteGalleryFiles([photo.storage_path as string]);
  } catch {
    // DB row sudah terhapus; storage orphan diabaikan
  }

  // Jika cover album = foto ini, ganti ke foto tersisa atau null
  const { data: album } = await supabase
    .from("albums")
    .select("id, cover_path")
    .eq("id", photo.album_id)
    .maybeSingle();

  if (album && album.cover_path === photo.storage_path) {
    const { data: next } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("album_id", photo.album_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase
      .from("albums")
      .update({ cover_path: next?.storage_path ?? null })
      .eq("id", photo.album_id);
  }

  revalidateGallery(photo.album_id as string);
}

export async function deleteAlbum(formData: FormData): Promise<void> {
  await requireEdit("galeri");
  const supabase = await createClient();

  const albumId = String(formData.get("albumId") || "");
  if (!albumId) throw new Error("Album wajib");

  const { data: album, error: fetchErr } = await supabase
    .from("albums")
    .select("id, cover_path")
    .eq("id", albumId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!album) throw new Error("Album tidak ditemukan");

  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("album_id", albumId);

  const { error } = await supabase.from("albums").delete().eq("id", albumId);
  if (error) throw new Error(error.message);

  const paths = [
    album.cover_path as string | null,
    ...((photos ?? []).map((p) => p.storage_path as string)),
  ];
  try {
    await deleteGalleryFiles(paths);
  } catch {
    // cascade DB ok; storage best-effort
  }

  revalidateGallery(albumId);
}
