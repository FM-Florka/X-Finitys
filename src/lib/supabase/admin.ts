import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — BYPASS RLS.
 * HANYA dipakai di server (seed/admin scripts, server actions yang memang butuh elevate).
 * Jangan import file ini dari Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL missing (server-only)",
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
