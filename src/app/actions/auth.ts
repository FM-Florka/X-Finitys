"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-helpers";
import { dashboardHome } from "@/lib/roles";
import type { AppRole } from "@/lib/types";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid_credentials")
  ) {
    return "Email atau password salah. Coba periksa lagi.";
  }
  if (m.includes("email not confirmed")) {
    return "Akun belum aktif. Hubungi pengurus kelas untuk mengaktifkan.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";
  }
  // Jangan bocorkan pesan teknis mentah ke end user
  return "Tidak bisa masuk sekarang. Coba beberapa saat lagi.";
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent("Email dan password wajib diisi.")}`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(friendlyAuthError(error.message))}`,
    );
  }

  // Bootstrap profile via RPC / upsert (lihat getProfile)
  const profile = await getProfile();
  if (!profile) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(
        "Akun Anda belum terdaftar di kelas ini. Hubungi pengurus kelas.",
      )}`,
    );
  }

  redirect(dashboardHome(profile.role as AppRole));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
