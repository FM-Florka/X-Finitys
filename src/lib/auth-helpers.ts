import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";
import {
  canAccessPengumuman,
  canCreatePeringatan,
  canEdit,
  canEditPengumuman,
  canView,
  type AppModule,
  type EditModule,
} from "@/lib/roles";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Ambil/ buat baris profiles untuk user yang sedang login. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("[getProfile] select", selectError.message);
  }
  if (existing) return existing as Profile;

  // 1) RPC security definer (paling andal, bypass RLS insert)
  const { data: viaRpc, error: rpcError } = await supabase.rpc(
    "ensure_own_profile",
  );
  if (rpcError) {
    console.error("[getProfile] ensure_own_profile", rpcError.message);
  } else if (viaRpc) {
    // rpc bisa return object atau array tergantung postgrest
    const row = Array.isArray(viaRpc) ? viaRpc[0] : viaRpc;
    if (row) return row as Profile;
  }

  // 2) Fallback upsert langsung (butuh policy insert self)
  const name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    "User";
  const rawRole =
    typeof user.user_metadata?.role === "string"
      ? user.user_metadata.role
      : "siswa";
  const role = (
    [
      "siswa",
      "ketua",
      "wakil",
      "bendahara",
      "keamanan",
      "kebersihan",
      "sekretaris",
      "guru",
    ].includes(rawRole)
      ? rawRole
      : "siswa"
  ) as AppRole;

  const { data: upserted, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? `${user.id}@unknown.local`,
        name,
        role,
      },
      { onConflict: "id" },
    )
    .select("*")
    .maybeSingle();

  if (upsertError) {
    console.error("[getProfile] upsert", upsertError.message);
    return null;
  }

  return (upserted as Profile | null) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile();
  if (profile) return profile;

  await supabase.auth.signOut();
  redirect(
    `/login?error=${encodeURIComponent(
      "Profil akun belum siap. Jalankan SQL migration 002_profiles_bootstrap.sql di Supabase SQL Editor, lalu login lagi.",
    )}`,
  );
}

/** Wajib punya akses **buka** modul — else redirect ringkasan. */
export async function requireView(module: AppModule): Promise<Profile> {
  const profile = await requireProfile();
  // Pengumuman: keamanan/kebersihan boleh buka untuk buat peringatan
  if (module === "pengumuman") {
    if (!canAccessPengumuman(profile.role as AppRole)) {
      redirect("/dashboard");
    }
    return profile;
  }
  if (!canView(profile.role as AppRole, module)) {
    redirect("/dashboard");
  }
  return profile;
}

/** Wajib punya akses **tulis** modul — else redirect ringkasan. */
export async function requireEdit(module: EditModule): Promise<Profile> {
  const profile = await requireProfile();
  if (!canEdit(profile.role as AppRole, module)) {
    redirect("/dashboard");
  }
  return profile;
}

/** Tulis pengumuman penuh ATAU hanya peringatan. */
export async function requirePengumumanWrite(): Promise<{
  profile: Profile;
  fullEditor: boolean;
  peringatanOnly: boolean;
}> {
  const profile = await requireProfile();
  const role = profile.role as AppRole;
  const fullEditor = canEditPengumuman(role);
  const peringatan = canCreatePeringatan(role);
  if (!fullEditor && !peringatan) {
    redirect("/dashboard");
  }
  return {
    profile,
    fullEditor,
    peringatanOnly: !fullEditor && peringatan,
  };
}
