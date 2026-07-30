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
    return "Email atau password salah. Pastikan user sudah dibuat di Supabase Auth (npm run db:seed-users).";
  }
  if (m.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Matikan Confirm email di Auth settings, atau konfirmasi dulu.";
  }
  return message;
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
        "Login OK, tapi baris profiles gagal dibuat. Jalankan supabase/migrations/002_profiles_bootstrap.sql di SQL Editor, lalu coba lagi.",
      )}`,
    );
  }

  redirect(dashboardHome(profile.role as AppRole));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
