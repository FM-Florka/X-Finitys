/**
 * Smoke-test deleteMember logic (mirror server action via service_role).
 * Creates temp siswa, deletes with FK scrub, asserts gone.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = `hapus-test-${Date.now()}@xfinitys.my.id`;
const PASS = "hapustes4455";

async function scrub(userId) {
  const ops = [
    () => admin.from("announcements").delete().eq("author_id", userId),
    () => admin.from("transactions").delete().eq("created_by", userId),
    () => admin.from("payment_status").delete().eq("user_id", userId),
    () => admin.from("incident_logs").delete().eq("author_id", userId),
    () => admin.from("photos").delete().eq("author_id", userId),
    () => admin.from("albums").delete().eq("author_id", userId),
    () =>
      admin.from("piket_checks").update({ checked_by: null }).eq("checked_by", userId),
    () =>
      admin.from("class_meta").update({ updated_by: null }).eq("updated_by", userId),
  ];
  for (const op of ops) {
    const { error } = await op();
    if (error) throw error;
  }
}

async function main() {
  console.log("create temp user", EMAIL);
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASS,
    email_confirm: true,
    user_metadata: { name: "Hapus Test", role: "siswa" },
  });
  if (cErr) throw cErr;
  const id = created.user.id;

  await admin.from("profiles").upsert({
    id,
    email: EMAIL,
    name: "Hapus Test",
    role: "siswa",
  });

  // seed a payment_status row to exercise cascade path
  const { error: payErr } = await admin.from("payment_status").insert({
    user_id: id,
    iuran_key: "test",
    period_key: "2026-01",
    paid: false,
    amount: 0,
  });
  if (payErr) console.warn("payment insert skip:", payErr.message);

  console.log("scrub + delete…");
  await scrub(id);
  const { error: pDel } = await admin.from("profiles").delete().eq("id", id);
  if (pDel) throw pDel;
  const { error: aDel } = await admin.auth.admin.deleteUser(id);
  if (aDel) throw aDel;

  const { data: leftP } = await admin
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  const { data: leftPay } = await admin
    .from("payment_status")
    .select("id")
    .eq("user_id", id);
  // auth list check
  let leftAuth = null;
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    leftAuth = data.users.find((u) => u.id === id) ?? null;
    if (leftAuth || data.users.length < 100) break;
  }

  console.log("leftover profile:", leftP ? "FAIL" : "none");
  console.log("leftover payment:", leftPay?.length ? leftPay.length : "none");
  console.log("leftover auth:", leftAuth ? "FAIL" : "none");

  if (leftP || leftAuth || (leftPay && leftPay.length)) {
    process.exitCode = 1;
  } else {
    console.log("OK delete path works");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
