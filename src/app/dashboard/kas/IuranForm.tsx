"use client";

import { createIuran } from "@/app/actions/kas";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function IuranForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [targetAmount, setTargetAmount] = useState(0);

  return (
    <form
      action={(fd) => {
        setError(null);
        if (targetAmount <= 0) {
          setError("Target nominal tidak valid");
          return;
        }
        fd.set("targetAmount", String(targetAmount));
        startTransition(async () => {
          try {
            await createIuran(fd);
            onClose?.();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal membuat iuran");
          }
        });
      }}
      className="space-y-2.5 sm:space-y-3.5"
    >
      <Field label="Nama iuran" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          placeholder="Contoh: Study tour, class meeting"
        />
      </Field>
      <Field label="Target nominal / siswa" htmlFor="targetAmount">
        <MoneyInput
          id="targetAmount"
          value={targetAmount}
          onValueChange={setTargetAmount}
          name="targetAmount"
          required
          placeholder="0"
        />
      </Field>
      <Field label="Tenggat (opsional)" htmlFor="deadline">
        <DatePicker id="deadline" name="deadline" placeholder="Pilih tenggat" />
      </Field>
      <Field label="Deskripsi" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Detail singkat iuran…"
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
          loading={pending}
          className="flex-1 sm:h-9 sm:flex-none sm:px-3.5 sm:text-sm"
        >
          {pending ? "Menyimpan…" : "Buat iuran"}
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
