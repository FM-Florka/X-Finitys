"use client";

import {
  markPaidFull,
  markUnpaid,
  setPaymentByUser,
} from "@/app/actions/kas";
import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatRp } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function PaymentEditor({
  userId,
  periodKey,
  iuranId,
  due,
  paidAmount,
}: {
  userId: string;
  periodKey: string;
  iuranId?: string;
  due: number;
  paidAmount: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(paidAmount > 0 ? paidAmount : 0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function hiddenFields(fd: FormData) {
    fd.set("userId", userId);
    fd.set("periodKey", periodKey);
    if (iuranId) fd.set("iuranId", iuranId);
    fd.set("due", String(due));
  }

  function run(fn: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <div className="space-y-2">
      <MoneyInput
        value={amount}
        onValueChange={setAmount}
        disabled={pending}
        placeholder="0"
        aria-label="Nominal bayar"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            run(async () => {
              const fd = new FormData();
              hiddenFields(fd);
              fd.set("amount", String(Math.max(0, Math.floor(amount || 0))));
              await setPaymentByUser(fd);
            });
          }}
        >
          Simpan
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || due <= 0}
          onClick={() => {
            setAmount(due);
            run(async () => {
              const fd = new FormData();
              hiddenFields(fd);
              await markPaidFull(fd);
            });
          }}
        >
          Lunas {formatRp(due)}
        </Button>
        {paidAmount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setAmount(0);
              run(async () => {
                const fd = new FormData();
                hiddenFields(fd);
                await markUnpaid(fd);
              });
            }}
          >
            Reset
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-[11px] text-[var(--danger-fg)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
