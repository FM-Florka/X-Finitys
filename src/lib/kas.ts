import {
  KAS_RUTIN_TARGET,
  listRecentPeriodKeys,
  payStateFrom,
  previousPeriodKey,
  type PayState,
} from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

export type StudentPayView = {
  userId: string;
  periodKey: string;
  iuranKey: string;
  /** Target periode ini saja (tanpa utang/kredit). */
  baseTarget: number;
  /**
   * Saldo masuk dari periode sebelumnya (bertanda).
   * >0 = utang numpuk, <0 = kredit (bayar di muka).
   */
  carryIn: number;
  /** Total tagihan yang masih harus dibayar minggu ini = max(0, base + carryIn). */
  due: number;
  /** Nominal dibayar di periode ini (dicatat di DB). */
  paidAmount: number;
  /** Sisa kurang minggu ini. */
  sisa: number;
  /**
   * Sisa kredit setelah target minggu ini (bisa dipakai minggu depan).
   * Contoh: bayar 10rb, target 2rb → creditOut 8rb.
   */
  creditOut: number;
  state: PayState;
  /** Utang terbuka (sisa > 0). */
  totalDebt: number;
  paymentId: string | null;
};

function paymentMap(
  payments: PaymentStatus[],
  iuranKey: string,
): Map<string, PaymentStatus> {
  const map = new Map<string, PaymentStatus>();
  for (const p of payments) {
    if (p.iuran_key !== iuranKey) continue;
    map.set(`${p.user_id}::${p.period_key}`, p);
  }
  return map;
}

/**
 * Saldo akhir suatu periode (bertanda):
 *   ending = carryIn + baseTarget - paid
 * >0 utang, <0 kredit.
 *
 * Minggu tanpa row:
 * - carryIn == 0 → anggap belum ditagih (0), jangan spam utang.
 * - carryIn != 0 → target minggu tetap jalan (kredit/utang berlanjut).
 */
export function endingBalanceForUser(
  userId: string,
  periodKey: string,
  map: Map<string, PaymentStatus>,
  baseTarget: number,
  depth = 52,
): number {
  if (depth <= 0) return 0;
  const prev = previousPeriodKey(periodKey);
  const carryIn = prev
    ? endingBalanceForUser(userId, prev, map, baseTarget, depth - 1)
    : 0;
  const row = map.get(`${userId}::${periodKey}`);

  if (!row && carryIn === 0) return 0;

  const paid = row?.amount ?? 0;
  return carryIn + baseTarget - paid;
}

/** Carry-in ke periodKey = ending balance period sebelumnya. */
export function carryInForUser(
  userId: string,
  periodKey: string,
  map: Map<string, PaymentStatus>,
  baseTarget: number,
  depth = 52,
): number {
  const prev = previousPeriodKey(periodKey);
  if (!prev) return 0;
  return endingBalanceForUser(userId, prev, map, baseTarget, depth);
}

export function buildRutinViews(
  userIds: string[],
  periodKey: string,
  payments: PaymentStatus[],
  baseTarget: number = KAS_RUTIN_TARGET,
): StudentPayView[] {
  const map = paymentMap(payments, "");
  return userIds.map((userId) => {
    const row = map.get(`${userId}::${periodKey}`);
    const carryIn = carryInForUser(userId, periodKey, map, baseTarget);
    const rawDue = baseTarget + carryIn; // bisa negatif kalau kredit besar
    const due = Math.max(0, rawDue);
    const paidAmount = row?.amount ?? 0;
    const sisa = Math.max(0, due - paidAmount);
    // ending = carryIn + base - paid = rawDue - paid
    const ending = rawDue - paidAmount;
    const creditOut = Math.max(0, -ending);
    const totalDebt = Math.max(0, ending);
    // Lunas jika tak ada sisa tagihan (termasuk karena kredit menutupi)
    const state = payStateFrom(paidAmount, due);

    return {
      userId,
      periodKey,
      iuranKey: "",
      baseTarget,
      carryIn,
      due,
      paidAmount,
      sisa,
      creditOut,
      state,
      totalDebt,
      paymentId: row?.id ?? null,
    };
  });
}

export function buildIuranViews(
  userIds: string[],
  iuranId: string,
  targetAmount: number,
  payments: PaymentStatus[],
): StudentPayView[] {
  const map = new Map<string, PaymentStatus>();
  for (const p of payments) {
    if (p.iuran_key === iuranId) {
      map.set(p.user_id, p);
    }
  }
  return userIds.map((userId) => {
    const row = map.get(userId);
    const paidAmount = row?.amount ?? 0;
    const due = targetAmount;
    const sisa = Math.max(0, due - paidAmount);
    const creditOut = Math.max(0, paidAmount - due);
    const state = payStateFrom(paidAmount, due);
    return {
      userId,
      periodKey: "",
      iuranKey: iuranId,
      baseTarget: targetAmount,
      carryIn: 0,
      due,
      paidAmount,
      sisa,
      creditOut,
      state,
      totalDebt: sisa,
      paymentId: row?.id ?? null,
    };
  });
}

export function totalDebtByUser(
  userIds: string[],
  periodKey: string,
  payments: PaymentStatus[],
  baseTarget: number = KAS_RUTIN_TARGET,
): Map<string, number> {
  const views = buildRutinViews(userIds, periodKey, payments, baseTarget);
  const m = new Map<string, number>();
  for (const v of views) m.set(v.userId, v.totalDebt);
  return m;
}

export function collectRutinPeriodKeys(
  payments: PaymentStatus[],
  current: string,
  minRecent = 12,
): string[] {
  const set = new Set<string>();
  set.add(current);
  for (const p of payments) {
    if (p.iuran_key === "" && p.period_key) set.add(p.period_key);
  }
  for (const k of listRecentPeriodKeys(current, minRecent)) set.add(k);
  return [...set].sort((a, b) => b.localeCompare(a));
}

export function periodRutinSummary(
  periodKey: string,
  userIds: string[],
  payments: PaymentStatus[],
  baseTarget: number = KAS_RUTIN_TARGET,
): { lunas: number; total: number; collected: number; debt: number } {
  const views = buildRutinViews(userIds, periodKey, payments, baseTarget);
  return {
    lunas: views.filter((v) => v.state === "lunas").length,
    total: views.length,
    collected: views.reduce((s, v) => s + v.paidAmount, 0),
    debt: views.reduce((s, v) => s + v.totalDebt, 0),
  };
}
