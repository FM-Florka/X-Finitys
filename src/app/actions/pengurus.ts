"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth-helpers";
import { ROLES } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole, Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Assign role kelas. AuthZ di app layer (requireEdit pengurus = ketua|wakil).
 * Write lewat service_role: RLS profiles_update_self_or_ketua masih ketua-only
 * sampai migration 006_profiles_wakil_rls.sql di-apply di Supabase.
 */
export async function assignRole(formData: FormData) {
  await requireEdit("pengurus");

  const userId = String(formData.get("userId") || "").trim();
  const role = String(formData.get("role") || "siswa") as AppRole;

  if (!userId) throw new Error("userId wajib");
  if (!(ROLES as string[]).includes(role)) {
    throw new Error(`Role tidak valid: ${role}`);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, role")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profil tidak ditemukan");

  revalidatePath("/dashboard/pengurus");
  revalidatePath("/dashboard");
}

/**
 * Hapus baris yang mereferensi profile (FK non-cascade) sebelum auth delete.
 * payment_status cascade; sisanya hard-delete / null-out.
 */
async function scrubProfileReferences(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const steps: { label: string; run: () => Promise<{ error: { message: string } | null }> }[] = [
    {
      label: "announcements",
      run: async () => {
        const { error } = await admin.from("announcements").delete().eq("author_id", userId);
        return { error: error ?? null };
      },
    },
    {
      label: "transactions",
      run: async () => {
        const { error } = await admin.from("transactions").delete().eq("created_by", userId);
        return { error: error ?? null };
      },
    },
    {
      label: "payment_status",
      run: async () => {
        const { error } = await admin.from("payment_status").delete().eq("user_id", userId);
        return { error: error ?? null };
      },
    },
    {
      label: "incident_logs",
      run: async () => {
        const { error } = await admin.from("incident_logs").delete().eq("author_id", userId);
        return { error: error ?? null };
      },
    },
    {
      label: "photos",
      run: async () => {
        const { error } = await admin.from("photos").delete().eq("author_id", userId);
        return { error: error ?? null };
      },
    },
    {
      label: "albums",
      run: async () => {
        const { error } = await admin.from("albums").delete().eq("author_id", userId);
        return { error: error ?? null };
      },
    },
    {
      label: "piket_checks.checked_by",
      run: async () => {
        const { error } = await admin
          .from("piket_checks")
          .update({ checked_by: null })
          .eq("checked_by", userId);
        return { error: error ?? null };
      },
    },
    {
      label: "class_meta.updated_by",
      run: async () => {
        const { error } = await admin
          .from("class_meta")
          .update({ updated_by: null })
          .eq("updated_by", userId);
        return { error: error ?? null };
      },
    },
  ];

  const failures: string[] = [];
  for (const s of steps) {
    const { error } = await s.run();
    if (error) failures.push(`${s.label}: ${error.message}`);
  }
  if (failures.length) {
    throw new Error(`Gagal bersihkan data terkait — ${failures.join("; ")}`);
  }
}

/**
 * Hapus total akun (auth.users + profiles + data terkait).
 * Hanya ketua/wakil (requireEdit pengurus). Tidak boleh hapus diri sendiri.
 */
export async function deleteMember(formData: FormData): Promise<void> {
  const actor = await requireEdit("pengurus");
  const userId = String(formData.get("userId") || "").trim();
  if (!userId) throw new Error("userId wajib");
  if (userId === actor.id) {
    throw new Error("Tidak bisa menghapus akun sendiri");
  }

  const admin = createAdminClient();

  const { data: target, error: readErr } = await admin
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!target) throw new Error("Profil tidak ditemukan");

  const profile = target as Pick<Profile, "id" | "email" | "name" | "role">;

  // Jaga minimal 1 ketua di kelas
  if (profile.role === "ketua") {
    const { count, error: countErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "ketua");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) <= 1) {
      throw new Error(
        "Tidak bisa menghapus ketua terakhir. Assign ketua lain dulu.",
      );
    }
  }

  await scrubProfileReferences(admin, userId);

  // Hapus explicit profile dulu (jaga orphan kalau auth sudah hilang)
  const { error: profileDelErr } = await admin
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (profileDelErr) throw new Error(profileDelErr.message);

  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    // Profile sudah terhapus — laporkan auth gagal supaya bisa di-handle manual
    throw new Error(
      `Profil dihapus, tapi auth gagal: ${authErr.message} (${profile.email})`,
    );
  }

  revalidatePath("/dashboard/pengurus");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kas");
}
