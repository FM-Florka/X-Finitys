import { KasClient } from "@/app/dashboard/kas/KasClient";
import { requireView } from "@/lib/auth-helpers";
import {
  buildIuranViews,
  collectRutinPeriodKeys,
  periodRutinSummary,
} from "@/lib/kas";
import { canEdit, ROLE_LABEL } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Iuran, PaymentStatus, Profile, Transaction } from "@/lib/types";
import { currentPeriodKey, KAS_RUTIN_TARGET } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kas" };

export default async function KasPage() {
  // View gate — role tanpa izin kas di-redirect
  const profile = await requireView("kas");
  const role = String(profile.role ?? "").trim().toLowerCase() as AppRole;
  // Edit gate — tombol iuran / transaksi / bayar
  const editable = canEdit(role, "kas");
  const currentPeriod = currentPeriodKey();
  const supabase = await createClient();

  const [incomeRes, expenseRes, txsRes, iuransRes, studentsRes, paymentsRes] =
    await Promise.all([
      supabase.from("transactions").select("amount").eq("type", "pemasukan"),
      supabase.from("transactions").select("amount").eq("type", "pengeluaran"),
      supabase
        .from("transactions")
        .select("*, creator:profiles!created_by(name), iuran:iuran(name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("iuran").select("*").order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("*")
        .neq("role", "guru")
        .order("name", { ascending: true }),
      // Semua payment_status — history multi-minggu (bukan cuma current)
      supabase
        .from("payment_status")
        .select("*, profile:profiles!user_id(name, role), iuran:iuran(*)"),
    ]);

  const loadErrors = [
    incomeRes.error?.message,
    expenseRes.error?.message,
    txsRes.error?.message,
    iuransRes.error?.message,
    studentsRes.error?.message,
    paymentsRes.error?.message,
  ].filter(Boolean) as string[];

  const income = (incomeRes.data ?? []).reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0,
  );
  const expense = (expenseRes.data ?? []).reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0,
  );
  const txs = (txsRes.data ?? []) as Transaction[];
  const iurans = (iuransRes.data ?? []) as Iuran[];
  const students = (studentsRes.data ?? []) as Profile[];
  const payments = (paymentsRes.data ?? []) as PaymentStatus[];
  const saldo = income - expense;

  const studentIds = students.map((s) => s.id);
  const periodKeys = collectRutinPeriodKeys(payments, currentPeriod, 12);
  const periodOptions = periodKeys.map((key) => {
    const summary = periodRutinSummary(
      key,
      studentIds,
      payments,
      KAS_RUTIN_TARGET,
    );
    return {
      key,
      isCurrent: key === currentPeriod,
      ...summary,
    };
  });

  const iuranBlocks = iurans.map((i) => {
    const views = buildIuranViews(
      studentIds,
      i.id,
      i.target_amount,
      payments,
    );
    return {
      iuran: i,
      views,
      paidCount: views.filter((v) => v.state === "lunas").length,
      collected: views.reduce((s, v) => s + v.paidAmount, 0),
    };
  });

  // Serialize payments for client recompute per selected period
  const paymentsLite = payments.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    iuran_id: p.iuran_id,
    iuran_key: p.iuran_key,
    period_key: p.period_key,
    paid: p.paid,
    amount: p.amount,
    paid_at: p.paid_at,
    note: p.note,
  }));

  return (
    <KasClient
      editable={editable}
      roleLabel={ROLE_LABEL[role] ?? role}
      loadErrors={loadErrors}
      saldo={saldo}
      income={income}
      expense={expense}
      currentPeriod={currentPeriod}
      periodOptions={periodOptions}
      students={students}
      payments={paymentsLite}
      iuranBlocks={iuranBlocks}
      iurans={iurans.map((i) => ({ id: i.id, name: i.name }))}
      txs={txs}
    />
  );
}
