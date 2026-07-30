/**
 * Seed 36 akun siswa kelas X F → Supabase Auth + profiles.
 *
 * Email:    <nama_pendek>@xfinitys.my.id
 * Password: <nama_pendek>4455
 * Role:     siswa (TIDAK overwrite role yang sudah di-assign manual)
 * Fields:   name, nis, gender
 *
 * Aturan nama_pendek (slug):
 *   - default: kata pertama nama, lowercase
 *   - jika kata pertama = Muhammad/Mohammad/Muhammed/Muhamad → pakai kata TERAKHIR
 *     (contoh: "Muhammad Nabil" → nabil@… / nabil4455)
 *
 * Butuh di .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Prasyarat schema: jalankan migration 005_profiles_gender.sql (kolom gender)
 * Jalankan: npm run db:seed-siswa
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

/** @type {{ name: string, nis: string, gender: 'L'|'P' }[]} */
const SISWA = [
  { name: "Adli Danar Ardiansyah", nis: "2611010008", gender: "L" },
  { name: "Aisyah Aulia Rahman", nis: "2611010016", gender: "P" },
  { name: "Alif Wahyudin", nis: "2611010025", gender: "L" },
  { name: "Asafa", nis: "2611010042", gender: "P" },
  { name: "Asti Asyifa Ravaie", nis: "2611010047", gender: "P" },
  { name: "Ayu Prisya Aguustina", nis: "2611010061", gender: "P" },
  { name: "Chilla Nikaia Putri", nis: "2611010076", gender: "P" },
  { name: "Dafiya Faiza Amalia", nis: "2611010080", gender: "P" },
  { name: "Divi Rizky Pratama", nis: "2611010094", gender: "L" },
  { name: "Faiza Aulia", nis: "2611010100", gender: "P" },
  { name: "Fatir", nis: "2611010106", gender: "L" },
  { name: "Hairil Nisa", nis: "2611010124", gender: "L" },
  { name: "Intan Ramadani", nis: "2611010137", gender: "P" },
  { name: "Jorghie Tri Anugrah", nis: "2611010146", gender: "L" },
  { name: "Kamila Raffani Sadiya", nis: "2611010149", gender: "P" },
  { name: "Meisya", nis: "2611010172", gender: "P" },
  { name: "Mevary Dicko Kurniawan", nis: "2611010177", gender: "L" },
  { name: "Muammar Rizqi", nis: "2611010183", gender: "L" },
  { name: "Muhammad Nabil", nis: "2611010196", gender: "L" },
  { name: "Najla Syahmaru Gafela", nis: "2611010215", gender: "P" },
  { name: "Nani Silvana", nis: "2611010217", gender: "P" },
  { name: "Naylatul Hidayah", nis: "2611010228", gender: "P" },
  { name: "Putri Ayu Meylani", nis: "2611010247", gender: "P" },
  { name: "Qonitah Althofunnisa", nis: "2611010249", gender: "P" },
  { name: "Raysha Rasyqa", nis: "2611010270", gender: "P" },
  { name: "Rei Hideo", nis: "2611010271", gender: "L" },
  { name: "Riansyah Alhudha Pratama", nis: "2611010274", gender: "L" },
  { name: "Rizal Eko Prasetiyo", nis: "2611010281", gender: "L" },
  { name: "Shafa Aprilyanti", nis: "2611010299", gender: "P" },
  { name: "Sinar Helmi Putra", nis: "2611010303", gender: "L" },
  { name: "Sri Ramadania", nis: "2611010312", gender: "P" },
  { name: "Syifa Azza Ramadani", nis: "2611010325", gender: "P" },
  { name: "Vira Syaputri", nis: "2611010338", gender: "P" },
  { name: "Wahid Fhariz Tasyalam", nis: "2611010343", gender: "L" },
  { name: "Yutika Rabuka Fatarda", nis: "2611010350", gender: "P" },
  { name: "Zahfarani Awaliyah", nis: "2611010352", gender: "P" },
];

/** Prefix yang di-skip → pakai nama belakang */
const SKIP_FIRST = new Set([
  "muhammad",
  "mohammad",
  "muhammed",
  "muhamad",
  "mohamad",
  "mohamed",
]);

function shortName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "user";
  const first = parts[0].toLowerCase();
  if (parts.length >= 2 && SKIP_FIRST.has(first)) {
    return parts[parts.length - 1].toLowerCase();
  }
  return first;
}

function toUser(s) {
  const slug = shortName(s.name);
  return {
    email: `${slug}@xfinitys.my.id`,
    password: `${slug}4455`,
    name: s.name,
    nis: s.nis,
    gender: s.gender,
    role: "siswa",
    slug,
  };
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

/**
 * @returns {'created'|'updated'|'failed'}
 */
async function ensureSiswa(u) {
  const existing = await findUserByEmail(u.email);
  let userId;
  let authAction;

  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: u.password,
      email_confirm: true,
      user_metadata: {
        name: u.name,
        nis: u.nis,
        gender: u.gender,
        // metadata role informatif; DB role yang dihormati
        role: u.role,
      },
    });
    if (error) throw error;
    authAction = "updated";
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        name: u.name,
        nis: u.nis,
        gender: u.gender,
        role: u.role,
      },
    });
    if (error) throw error;
    userId = data.user.id;
    authAction = "created";
  }

  // Baca profile existing — jangan overwrite role yang sudah di-assign manual
  const { data: existingProfile, error: readErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) throw readErr;

  const roleToSet = existingProfile?.role ?? u.role;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: u.email,
      name: u.name,
      role: roleToSet,
      nis: u.nis,
      gender: u.gender,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const roleNote =
    existingProfile && existingProfile.role !== "siswa"
      ? ` (role preserved: ${existingProfile.role})`
      : "";
  console.log(
    `${authAction} ${u.email}  nis=${u.nis} ${u.gender}  role=${roleToSet}${roleNote}`,
  );
  return authAction;
}

async function main() {
  console.log(`Seeding ${SISWA.length} siswa → ${url}\n`);

  const users = SISWA.map(toUser);

  // Deteksi slug email duplikat di list
  const seen = new Map();
  const dups = [];
  for (const u of users) {
    if (seen.has(u.email)) dups.push(u.email);
    else seen.set(u.email, u);
  }
  if (dups.length) {
    console.error("DUPLICATE short-name emails in source list:", dups);
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  /** @type {{ email: string, error: string }[]} */
  const failures = [];

  for (const u of users) {
    try {
      const action = await ensureSiswa(u);
      if (action === "created") created += 1;
      else updated += 1;
    } catch (err) {
      failed += 1;
      const msg = err?.message ?? String(err);
      failures.push({ email: u.email, error: msg });
      console.error(`FAIL ${u.email}:`, msg);
    }
  }

  console.log("\n── Summary ──");
  console.log(`created : ${created}`);
  console.log(`updated : ${updated} (already existed — password/profile refreshed)`);
  console.log(`failed  : ${failed}`);
  console.log(`total   : ${created + updated + failed} / ${users.length}`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f.email}: ${f.error}`);
  }
  console.log(
    "\nLogin contoh: adli@xfinitys.my.id / adli4455  (pattern: <slug>@xfinitys.my.id / <slug>4455)",
  );
}

main();
