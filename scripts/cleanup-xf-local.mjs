/**
 * Hapus total semua akun demo @xf.local + data terkait.
 *
 * Urutan:
 *   1. Cari auth users / profiles ber-email *@xf.local
 *   2. Hapus/null-kan baris yang mereferensi profiles (FK non-cascade)
 *   3. Hapus auth.users via service_role (profiles cascade)
 *
 * Butuh di .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Jalankan: node scripts/cleanup-xf-local.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DOMAIN = "@xf.local";

async function listXfLocalAuthUsers() {
  /** @type {import('@supabase/supabase-js').User[]} */
  const hits = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.toLowerCase().endsWith(DOMAIN)) hits.push(u);
    }
    if (data.users.length < 100) break;
  }
  return hits;
}

async function listXfLocalProfiles() {
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, name, role")
    .ilike("email", `%${DOMAIN}`);
  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} label
 * @param {() => Promise<{ count?: number | null, error: any, data?: any }>} fn
 */
async function step(label, fn) {
  const result = await fn();
  if (result.error) {
    console.error(`  FAIL ${label}:`, result.error.message ?? result.error);
    return { ok: false, count: 0, error: result.error };
  }
  const count =
    typeof result.count === "number"
      ? result.count
      : Array.isArray(result.data)
        ? result.data.length
        : result.data
          ? 1
          : 0;
  console.log(`  OK   ${label}: ${count}`);
  return { ok: true, count, error: null };
}

async function deleteRelatedData(ids) {
  if (ids.length === 0) {
    console.log("No profile IDs — skip related data cleanup.");
    return { failures: [] };
  }

  console.log(`\nCleaning related data for ${ids.length} profile(s)…`);
  /** @type {{ label: string, error: any }[]} */
  const failures = [];

  // 1) Hard-delete rows owned by these users
  const hardDeletes = [
    [
      "announcements (author)",
      () => admin.from("announcements").delete({ count: "exact" }).in("author_id", ids),
    ],
    [
      "transactions (created_by)",
      () => admin.from("transactions").delete({ count: "exact" }).in("created_by", ids),
    ],
    [
      "payment_status (user)",
      () => admin.from("payment_status").delete({ count: "exact" }).in("user_id", ids),
    ],
    [
      "incident_logs (author)",
      () => admin.from("incident_logs").delete({ count: "exact" }).in("author_id", ids),
    ],
    [
      "photos (author)",
      () => admin.from("photos").delete({ count: "exact" }).in("author_id", ids),
    ],
    [
      "albums (author)",
      () => admin.from("albums").delete({ count: "exact" }).in("author_id", ids),
    ],
  ];

  for (const [label, fn] of hardDeletes) {
    const r = await step(label, fn);
    if (!r.ok) failures.push({ label, error: r.error });
  }

  // 2) Null-out nullable FKs so profiles can go away cleanly
  const nullUpdates = [
    [
      "piket_checks.checked_by → null",
      () =>
        admin
          .from("piket_checks")
          .update({ checked_by: null }, { count: "exact" })
          .in("checked_by", ids),
    ],
    [
      "class_meta.updated_by → null",
      () =>
        admin
          .from("class_meta")
          .update({ updated_by: null }, { count: "exact" })
          .in("updated_by", ids),
    ],
  ];

  for (const [label, fn] of nullUpdates) {
    const r = await step(label, fn);
    if (!r.ok) failures.push({ label, error: r.error });
  }

  return { failures };
}

async function deleteAuthUsers(users) {
  console.log(`\nDeleting ${users.length} auth user(s)…`);
  let deleted = 0;
  /** @type {{ email: string, error: string }[]} */
  const failures = [];

  for (const u of users) {
    const email = u.email ?? u.id;
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) {
      failures.push({ email, error: error.message ?? String(error) });
      console.error(`  FAIL auth ${email}:`, error.message ?? error);
    } else {
      deleted += 1;
      console.log(`  OK   auth deleted: ${email} (${u.id})`);
    }
  }

  return { deleted, failures };
}

async function main() {
  console.log(`Cleanup @xf.local → ${url}\n`);

  const [authUsers, profiles] = await Promise.all([
    listXfLocalAuthUsers(),
    listXfLocalProfiles(),
  ]);

  console.log("Found auth users:");
  if (authUsers.length === 0) console.log("  (none)");
  else for (const u of authUsers) console.log(`  - ${u.email}  ${u.id}`);

  console.log("\nFound profiles:");
  if (profiles.length === 0) console.log("  (none)");
  else
    for (const p of profiles)
      console.log(`  - ${p.email}  role=${p.role}  ${p.id}`);

  // Union of IDs from both sources (orphan profiles / orphan auth)
  const idSet = new Set([
    ...authUsers.map((u) => u.id),
    ...profiles.map((p) => p.id),
  ]);
  const ids = [...idSet];

  const related = await deleteRelatedData(ids);

  // Explicit profile delete (auth delete also cascades, but covers orphans)
  if (ids.length) {
    console.log("\nDeleting profiles…");
    const r = await step("profiles", () =>
      admin.from("profiles").delete({ count: "exact" }).in("id", ids),
    );
    if (!r.ok) {
      related.failures.push({ label: "profiles", error: r.error });
    }
  }

  const authResult = await deleteAuthUsers(authUsers);

  // Re-check leftover
  const [leftAuth, leftProfiles] = await Promise.all([
    listXfLocalAuthUsers(),
    listXfLocalProfiles(),
  ]);

  console.log("\n── Summary ──");
  console.log(`auth users found     : ${authUsers.length}`);
  console.log(`auth users deleted   : ${authResult.deleted}`);
  console.log(`auth delete failures : ${authResult.failures.length}`);
  console.log(`related data failures: ${related.failures.length}`);
  console.log(`leftover auth        : ${leftAuth.length}`);
  console.log(`leftover profiles    : ${leftProfiles.length}`);

  if (authResult.failures.length) {
    console.log("\nAuth failures:");
    for (const f of authResult.failures)
      console.log(`  - ${f.email}: ${f.error}`);
  }
  if (related.failures.length) {
    console.log("\nRelated-data failures (mungkin butuh handle manual / FK):");
    for (const f of related.failures)
      console.log(`  - ${f.label}: ${f.error?.message ?? f.error}`);
  }
  if (leftAuth.length || leftProfiles.length) {
    console.log("\nLeftovers:");
    for (const u of leftAuth) console.log(`  auth: ${u.email} ${u.id}`);
    for (const p of leftProfiles)
      console.log(`  profile: ${p.email} ${p.id}`);
  }

  if (
    authResult.failures.length ||
    related.failures.length ||
    leftAuth.length ||
    leftProfiles.length
  ) {
    process.exitCode = 1;
  } else {
    console.log("\nAll @xf.local accounts and related data cleaned.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
