"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEdit } from "@/lib/auth-helpers";
import { formatPeriodLabel } from "@/lib/utils";

function revalidateKas() {
  revalidatePath("/dashboard/kas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/saya");
}

export async function createTransaction(formData: FormData) {
  const profile = await requireEdit("kas");
  const supabase = await createClient();

  const type = String(formData.get("type") || "pemasukan");
  const kind = String(formData.get("kind") || "rutin");
  const amount = Number(formData.get("amount") || 0);
  const note = String(formData.get("note") || "") || null;
  const iuranId = String(formData.get("iuranId") || "") || null;
  const dateRaw = String(formData.get("date") || "");

  if (!amount || amount <= 0) throw new Error("Nominal tidak valid");
  if (type !== "pemasukan" && type !== "pengeluaran") {
    throw new Error("Tipe transaksi tidak valid");
  }
  if (kind !== "rutin" && kind !== "iuran" && kind !== "lain") {
    throw new Error("Jenis transaksi tidak valid");
  }

  const { error } = await supabase.from("transactions").insert({
    type,
    kind,
    amount,
    note,
    date: dateRaw || undefined,
    iuran_id: kind === "iuran" ? iuranId : null,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidateKas();
}

export async function createIuran(formData: FormData) {
  await requireEdit("kas");
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const targetAmount = Number(formData.get("targetAmount") || 0);
  const deadlineRaw = String(formData.get("deadline") || "");
  const description = String(formData.get("description") || "") || null;

  if (!name || targetAmount <= 0) throw new Error("Data iuran tidak valid");

  const { error } = await supabase.from("iuran").insert({
    name,
    target_amount: targetAmount,
    description,
    deadline: deadlineRaw || null,
  });
  if (error) throw new Error(error.message);

  revalidateKas();
}

export async function deleteIuran(formData: FormData) {
  await requireEdit("kas");
  const supabase = await createClient();

  const id = String(formData.get("iuranId") || "");
  if (!id) throw new Error("Iuran tidak ditemukan");

  const { error } = await supabase.from("iuran").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateKas();
}

/**
 * Catat nominal bayar per siswa (partial OK).
 * `due` = total tagihan periode (base + carry-in) dari UI.
 * `paid` flag = amount >= due.
 * Delta nominal → riwayat transaksi (pemasukan / koreksi).
 */
export async function setPaymentByUser(formData: FormData) {
  const editor = await requireEdit("kas");
  const supabase = await createClient();

  const userId = String(formData.get("userId") || "");
  const periodKey = String(formData.get("periodKey") || "") || "";
  const iuranIdRaw = String(formData.get("iuranId") || "");
  const iuranId = iuranIdRaw || null;
  const iuranKey = iuranIdRaw || "";
  const amount = Math.max(0, Math.floor(Number(formData.get("amount") || 0)));
  const due = Math.max(0, Math.floor(Number(formData.get("due") || 0)));

  if (!userId) throw new Error("Siswa tidak valid");

  const isPaid = due > 0 ? amount >= due : amount > 0;
  const payload = {
    paid: isPaid,
    amount,
    paid_at: amount > 0 ? new Date().toISOString() : null,
    iuran_id: iuranId,
  };

  const { data: existing } = await supabase
    .from("payment_status")
    .select("id, amount")
    .eq("user_id", userId)
    .eq("iuran_key", iuranKey)
    .eq("period_key", periodKey)
    .maybeSingle();

  const prevAmount = existing?.amount ?? 0;

  if (existing) {
    const { error } = await supabase
      .from("payment_status")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("payment_status").insert({
      user_id: userId,
      period_key: periodKey,
      iuran_key: iuranKey,
      ...payload,
    });
    if (error) throw new Error(error.message);
  }

  // Log delta ke riwayat transaksi agar saldo & log sinkron
  const delta = amount - prevAmount;
  if (delta !== 0) {
    const [{ data: student }, { data: iuran }] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
      iuranId
        ? supabase.from("iuran").select("name").eq("id", iuranId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const studentName = student?.name?.trim() || "Siswa";
    let note: string;
    if (iuranId) {
      const iuranName = iuran?.name?.trim() || "iuran khusus";
      note =
        delta > 0
          ? `${studentName} membayarkan iuran ${iuranName}`
          : `Koreksi bayar ${studentName} · iuran ${iuranName}`;
    } else {
      const periodLabel = periodKey ? formatPeriodLabel(periodKey) : "kas rutin";
      note =
        delta > 0
          ? `${studentName} membayarkan uang kas · ${periodLabel}`
          : `Koreksi bayar ${studentName} · ${periodLabel}`;
    }

    const { error: txError } = await supabase.from("transactions").insert({
      type: delta > 0 ? "pemasukan" : "pengeluaran",
      kind: iuranId ? "iuran" : "rutin",
      amount: Math.abs(delta),
      note,
      iuran_id: iuranId,
      created_by: editor.id,
    });
    if (txError) throw new Error(txError.message);
  }

  revalidateKas();
}

/** Tandai lunas penuh (amount = due). */
export async function markPaidFull(formData: FormData) {
  const due = Math.max(0, Math.floor(Number(formData.get("due") || 0)));
  formData.set("amount", String(due));
  await setPaymentByUser(formData);
}

/** Reset bayar ke 0. */
export async function markUnpaid(formData: FormData) {
  formData.set("amount", "0");
  await setPaymentByUser(formData);
}
