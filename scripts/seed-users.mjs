/**
 * Seed demo users ke Supabase Auth + profiles.
 *
 * Butuh di .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings → API → service_role)
 *
 * Jalankan: npm run db:seed-users
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
  console.error(
    "Ambil service_role key dari Supabase → Project Settings → API (jangan expose ke client).",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "ketua@xf.local", password: "password123", name: "Ketua Kelas", role: "ketua" },
  { email: "wakil@xf.local", password: "password123", name: "Wakil Ketua", role: "wakil" },
  { email: "bendahara@xf.local", password: "password123", name: "Bendahara", role: "bendahara" },
  { email: "keamanan@xf.local", password: "password123", name: "Seksi Keamanan", role: "keamanan" },
  { email: "kebersihan@xf.local", password: "password123", name: "Seksi Kebersihan", role: "kebersihan" },
  { email: "sekretaris@xf.local", password: "password123", name: "Sekretaris", role: "sekretaris" },
  { email: "guru@xf.local", password: "password123", name: "Bu Rani", role: "guru" },
  { email: "siswa1@xf.local", password: "password123", name: "Siswa Satu", role: "siswa" },
  { email: "siswa2@xf.local", password: "password123", name: "Siswa Dua", role: "siswa" },
];

async function findUserByEmail(email) {
  // listUsers paginated — demo set kecil, ambil beberapa page
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 100) break;
  }
  return null;
}

async function ensureUser(u) {
  const existing = await findUserByEmail(u.email);
  let userId;

  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });
    if (error) throw error;
    console.log(`updated auth: ${u.email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`created auth: ${u.email}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: u.email,
      name: u.name,
      role: u.role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;
  console.log(`  profile role=${u.role}`);
}

async function main() {
  console.log(`Seeding users → ${url}`);
  for (const u of USERS) {
    try {
      await ensureUser(u);
    } catch (err) {
      console.error(`FAIL ${u.email}:`, err.message ?? err);
    }
  }
  console.log("Done. Login dengan password123");
}

main();
