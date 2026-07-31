"use server";

import { revalidatePath } from "next/cache";
import { requireEdit, requireView } from "@/lib/auth-helpers";
import { canDeleteAnyMateri } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Material } from "@/lib/types";

const BUCKET = "materi";
/** 25 MB — cukup untuk PDF/slide, menahan upload video besar. */
const MAX_SIZE = 25 * 1024 * 1024;

function revalidateMateri() {
  revalidatePath("/dashboard/materi");
}

/** Buang karakter yang menyulitkan di path storage, pertahankan ekstensi. */
function safeFileName(name: string): string {
  const clean = name
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(-80);
  return clean || "file";
}

export async function uploadMateri(formData: FormData) {
  const profile = await requireEdit("materi");
  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const subject = String(formData.get("subject") || "").trim() || null;
  const file = formData.get("file") as File | null;

  if (!title) throw new Error("Judul wajib diisi");
  if (!file || file.size === 0) throw new Error("File wajib dipilih");
  if (file.size > MAX_SIZE) {
    throw new Error("Ukuran file maksimal 25 MB");
  }

  const fileName = safeFileName(file.name);
  const path = `${profile.id}/${crypto.randomUUID()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("materials").insert({
    title,
    description,
    subject,
    storage_path: path,
    file_name: fileName,
    file_size: file.size,
    mime_type: file.type || null,
    uploaded_by: profile.id,
  });

  if (error) {
    // Baris gagal dibuat — jangan tinggalkan file orphan di storage
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }

  revalidateMateri();
}

export async function deleteMateri(formData: FormData) {
  const profile = await requireEdit("materi");
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("ID materi wajib");

  const { data, error: readError } = await supabase
    .from("materials")
    .select("id, storage_path, uploaded_by")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!data) throw new Error("Materi tidak ditemukan");

  const row = data as Pick<Material, "id" | "storage_path" | "uploaded_by">;
  const mine = row.uploaded_by === profile.id;
  if (!mine && !canDeleteAnyMateri(profile.role)) {
    throw new Error("Hanya pengunggah atau wali/ketua/wakil yang bisa hapus");
  }

  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Baris sudah hilang; file orphan tidak fatal, jadi error di sini diabaikan
  await supabase.storage.from(BUCKET).remove([row.storage_path]);

  revalidateMateri();
}

/**
 * Signed URL untuk download. Bucket `materi` private, jadi URL dibuat
 * on demand dan hanya berlaku sebentar.
 */
export async function getMateriUrl(storagePath: string): Promise<string> {
  await requireView("materi");
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 5);
  if (error) throw new Error(error.message);
  if (!data?.signedUrl) throw new Error("Gagal membuat tautan unduhan");

  return data.signedUrl;
}
