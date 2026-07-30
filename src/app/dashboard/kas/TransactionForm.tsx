"use client";

import { createTransaction } from "@/app/actions/kas";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, Textarea } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select } from "@/components/ui/Select";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

const TYPE_OPTIONS = [
  { value: "pemasukan", label: "Pemasukan" },
  { value: "pengeluaran", label: "Pengeluaran" },
];

const KIND_OPTIONS = [
  { value: "rutin", label: "Kas rutin" },
  { value: "iuran", label: "Iuran khusus" },
  { value: "lain", label: "Lainnya" },
];

export function TransactionForm({
  iurans,
  onClose,
}: {
  iurans: { id: string; name: string }[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("rutin");
  const [amount, setAmount] = useState(0);

  const iuranOptions = useMemo(
    () => [
      { value: "", label: "— Pilih iuran —" },
      ...iurans.map((i) => ({ value: i.id, label: i.name })),
    ],
    [iurans],
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={(fd) => {
        setError(null);
        if (amount <= 0) {
          setError("Nominal tidak valid");
          return;
        }
        fd.set("amount", String(amount));
        startTransition(async () => {
          try {
            await createTransaction(fd);
            onClose?.();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal menyimpan");
          }
        });
      }}
      className="space-y-2.5 sm:space-y-3.5"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        <Field label="Tipe" htmlFor="type">
          <Select
            id="type"
            name="type"
            defaultValue="pemasukan"
            options={TYPE_OPTIONS}
          />
        </Field>
        <Field label="Jenis" htmlFor="kind">
          <Select
            id="kind"
            name="kind"
            defaultValue="rutin"
            options={KIND_OPTIONS}
            onChange={setKind}
          />
        </Field>
      </div>
      <Field label="Nominal" htmlFor="amount">
        <MoneyInput
          id="amount"
          value={amount}
          onValueChange={setAmount}
          name="amount"
          required
          placeholder="0"
        />
      </Field>
      <Field label="Tanggal" htmlFor="date">
        <DatePicker id="date" name="date" defaultValue={today} />
      </Field>
      {kind === "iuran" ? (
        <Field label="Iuran" htmlFor="iuranId">
          <Select
            id="iuranId"
            name="iuranId"
            defaultValue=""
            options={iuranOptions}
            placeholder="Pilih iuran"
          />
        </Field>
      ) : (
        <input type="hidden" name="iuranId" value="" />
      )}
      <Field label="Keterangan" htmlFor="note">
        <Textarea
          id="note"
          name="note"
          required
          rows={2}
          placeholder="Contoh: kas minggu ini, beli spidol"
        />
      </Field>
      {error ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-2.5 py-1.5 text-xs text-[var(--danger-fg)] sm:px-3 sm:py-2 sm:text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 sm:pt-4">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="flex-1 sm:h-9 sm:flex-none sm:px-3.5 sm:text-sm"
        >
          {pending ? "Menyimpan…" : "Simpan transaksi"}
        </Button>
        {onClose ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={pending}
            className="sm:h-9 sm:px-3.5 sm:text-sm"
          >
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );
}
