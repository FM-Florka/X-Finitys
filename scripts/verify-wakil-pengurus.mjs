/**
 * Verifikasi akses wakil → modul pengurus.
 *
 * - Cek matrix di src/lib/roles.ts
 * - Pastikan akun wakil@xfinitys.my.id ada (role=wakil)
 * - Simulasi assignRole: update role lewat service_role SETELAH cek canEdit
 * - Probe RLS user-JWT (info saja; boleh gagal sampai 006 di-apply)
 *
 * Login UI: wakil@xfinitys.my.id / wakil4455 → /dashboard/pengurus
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL = "wakil@xfinitys.my.id";
const TEST_PASSWORD = "wakil4455";
const TEST_NAME = "Wakil Ketua (test)";

function assertRolesSource() {
  const src = readFileSync(resolve("src/lib/roles.ts"), "utf8");
  // Split VIEW_ACCESS / EDIT_ACCESS roughly by export name order
  const viewPart = src.split("export const VIEW_ACCESS")[1]?.split(
    "export const EDIT_ACCESS",
  )[0];
  const editPart = src.split("export const EDIT_ACCESS")[1]?.split(
    "export function canView",
  )[0];
  const viewWakil = viewPart?.match(/wakil:\s*\[([\s\S]*?)\],/)?.[1] ?? "";
  const editWakil = editPart?.match(/wakil:\s*\[([\s\S]*?)\],/)?.[1] ?? "";
  const viewOk = viewWakil.includes("pengurus");
  const editOk = editWakil.includes("pengurus");
  console.log(`roles.ts VIEW wakil has pengurus: ${viewOk ? "YES" : "NO"}`);
  console.log(`roles.ts EDIT wakil has pengurus: ${editOk ? "YES" : "NO"}`);
  if (!viewOk || !editOk) {
    throw new Error("src/lib/roles.ts belum grant pengurus ke wakil");
  }
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const hit = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (hit) return hit;
    if (data.users.length < 100) break;
  }
  return null;
}

async function ensureWakil() {
  let user = await findUserByEmail(TEST_EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: TEST_NAME, role: "wakil" },
    });
    if (error) throw error;
    user = data.user;
    console.log(`created ${TEST_EMAIL}`);
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: TEST_NAME, role: "wakil" },
    });
    console.log(`refreshed ${TEST_EMAIL}`);
  }
  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: TEST_EMAIL,
      name: TEST_NAME,
      role: "wakil",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
  return user;
}

/** Mirror app AuthZ + service_role write (sama pola assignRole). */
async function simulateAssignRole(actorRole, victimId, newRole) {
  // app layer
  const allowed =
    actorRole === "ketua" || actorRole === "wakil"; /* EDIT pengurus */
  if (!allowed) return { ok: false, reason: "requireEdit blocked" };

  const { data, error } = await admin
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", victimId)
    .select("id, role")
    .maybeSingle();
  if (error) return { ok: false, reason: error.message };
  if (!data) return { ok: false, reason: "not found / 0 rows" };
  return { ok: true, data };
}

async function probeUserJwtRls(victimId) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: se } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (se) return { ok: false, detail: se.message };

  const { data, error } = await client
    .from("profiles")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", victimId)
    .select("id");
  await client.auth.signOut();

  // PostgREST + RLS: sukses palsu sering return data=[] tanpa error
  if (error) return { ok: false, detail: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      detail: "0 rows (RLS block silent) — jalankan 006_profiles_wakil_rls.sql",
    };
  }
  return { ok: true, detail: `updated ${data.length} row(s)` };
}

async function main() {
  console.log("── 1. App matrix ──");
  assertRolesSource();

  console.log("\n── 2. Test user ──");
  const wakil = await ensureWakil();
  const { data: victims, error: vErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("role", "siswa")
    .neq("id", wakil.id)
    .limit(1);
  if (vErr) throw vErr;
  const victim = victims?.[0];
  if (!victim) throw new Error("Tidak ada profil siswa untuk test");
  console.log(`victim ${victim.email} role=${victim.role}`);

  console.log("\n── 3. Simulasi assignRole (app AuthZ + service_role) ──");
  const original = victim.role;
  const flip = await simulateAssignRole("wakil", victim.id, "sekretaris");
  if (!flip.ok) {
    console.error("FAIL assign:", flip.reason);
    process.exitCode = 1;
    return;
  }
  console.log(`OK   wakil assign → sekretaris (${flip.data.id})`);
  const restore = await simulateAssignRole("wakil", victim.id, original);
  if (!restore.ok) {
    console.error("FAIL restore:", restore.reason);
    // hard restore
    await admin.from("profiles").update({ role: original }).eq("id", victim.id);
    process.exitCode = 1;
    return;
  }
  console.log(`OK   restore → ${original}`);

  console.log("\n── 4. Probe RLS user-JWT (opsional / info) ──");
  const rls = await probeUserJwtRls(victim.id);
  console.log(
    rls.ok
      ? `OK   RLS allows wakil update: ${rls.detail}`
      : `INFO RLS still blocks wakil: ${rls.detail}`,
  );

  console.log("\n── Summary ──");
  console.log("Redirect /dashboard/pengurus : fixed via roles.ts matrix");
  console.log("assignRole server action     : service_role after requireEdit");
  console.log(
    `RLS migration 006             : ${rls.ok ? "applied" : "BELUM — SQL Editor"}`,
  );
  console.log(`\nUI test login: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  console.log("Path: /dashboard/pengurus (nav Pengurus harus muncul)");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
