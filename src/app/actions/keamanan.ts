"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

function revalidateKeamanan() {
  revalidatePath("/dashboard/keamanan");
  revalidatePath("/dashboard");
}

function parseOccurredAt(raw: string): string {
  const s = raw.trim();
  if (!s) return new Date().toISOString();
  // datetime-local: "YYYY-MM-DDTHH:mm" → treat as local, store ISO
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Tanggal/waktu kejadian tidak valid");
  }
  return d.toISOString();
}

export async function createIncident(formData: FormData) {
  const profile = await requireEdit("keamanan");
  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const studentName = String(formData.get("studentName") || "").trim() || null;
  const occurredRaw = String(formData.get("occurredAt") || "").trim();

  if (!title || !description) throw new Error("Judul dan detail wajib diisi");

  const occurredAt = parseOccurredAt(occurredRaw);
  const dateOnly = occurredAt.slice(0, 10);

  const { error } = await supabase.from("incident_logs").insert({
    title,
    description,
    student_name: studentName,
    occurred_at: occurredAt,
    date: dateOnly,
    author_id: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidateKeamanan();
}

export async function deleteIncident(formData: FormData) {
  await requireEdit("keamanan");
  const supabase = await createClient();
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("ID log wajib");

  const { error } = await supabase.from("incident_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateKeamanan();
}
