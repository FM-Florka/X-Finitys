/**
 * Apply 006_profiles_wakil_rls.sql via PostgREST is impossible for DDL.
 * Instead: create a temporary SECURITY DEFINER RPC with service role? Still needs SQL once.
 *
 * This script uses the Supabase Database REST (pg-meta) style endpoint when available,
 * falling back to clear instructions.
 *
 * Preferred path: run SQL with service_role via supabase-js by creating exec_sql if present,
 * else print the SQL for Supabase SQL Editor.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sqlPath = resolve(process.cwd(), "supabase/migrations/006_profiles_wakil_rls.sql");
const sql = readFileSync(sqlPath, "utf8");

if (!url || !serviceKey) {
  console.error("Missing URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function tryRpcExec() {
  // Common helper names some projects install
  for (const name of ["exec_sql", "execute_sql", "run_sql"]) {
    const { error } = await admin.rpc(name, { query: sql });
    if (!error) return { ok: true, via: name };
    if (!/could not find|function|PGRST/i.test(error.message)) {
      return { ok: false, via: name, error };
    }
  }
  return { ok: false, via: null };
}

async function tryPgMeta() {
  // Studio/pg-meta internal endpoint — works on some self-hosted, rarely on cloud
  const endpoints = [
    `${url}/pg/query`,
    `${url}/pg-meta/default/query`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      if (res.ok) return { ok: true, via: endpoint, body: text };
      console.log(`  ${endpoint} → ${res.status} ${text.slice(0, 120)}`);
    } catch (e) {
      console.log(`  ${endpoint} → ${e.message}`);
    }
  }
  return { ok: false };
}

async function verifyPolicyByProbe() {
  // After policy applied: create temp user, set role wakil, try update another profile as that user.
  // Without user JWT we can only check policy catalog if exposed — skip.
  // Soft check: service role can always update; not useful.
  return null;
}

async function main() {
  console.log("Applying 006_profiles_wakil_rls.sql…\n");

  const rpc = await tryRpcExec();
  if (rpc.ok) {
    console.log(`Applied via rpc ${rpc.via}`);
    return;
  }
  if (rpc.error) console.error("rpc error:", rpc.error.message);

  console.log("Trying pg-meta endpoints…");
  const pg = await tryPgMeta();
  if (pg.ok) {
    console.log(`Applied via ${pg.via}`);
    return;
  }

  console.log("\n⚠ Tidak bisa apply DDL otomatis dari service_role.");
  console.log("Jalankan SQL berikut di Supabase → SQL Editor:\n");
  console.log("─".repeat(60));
  console.log(sql);
  console.log("─".repeat(60));
  process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
