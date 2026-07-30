"use client";

import { PaymentEditor } from "@/app/dashboard/kas/PaymentEditor";
import { Badge } from "@/components/ui/Badge";
import type { StudentPayView } from "@/lib/kas";
import { ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/lib/types";
import {
  cn,
  formatRp,
  payStateLabel,
  payStateTone,
} from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export function StudentPayCard({
  name,
  role,
  view,
  editable,
  iuranId,
}: {
  name: string;
  role: AppRole | string;
  view: StudentPayView;
  editable: boolean;
  iuranId?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const roleLabel = ROLE_LABEL[role as AppRole] ?? role;
  const creditIn = Math.max(0, -view.carryIn);
  const debtIn = Math.max(0, view.carryIn);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 p-3.5 text-left sm:cursor-default sm:p-4",
          "transition hover:bg-muted-bg/60 sm:hover:bg-transparent",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold sm:text-[15px]">{name}</p>
          <p className="mt-0.5 text-xs text-muted">{roleLabel}</p>
        </div>
        <Badge tone={payStateTone(view.state)} className="shrink-0">
          {payStateLabel(view.state, view.sisa, view.creditOut)}
        </Badge>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition-transform duration-200 sm:hidden",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out sm:grid-rows-[1fr]!",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-border px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div>
                <dt className="text-muted">Tagihan</dt>
                <dd className="font-semibold">{formatRp(view.due)}</dd>
              </div>
              <div>
                <dt className="text-muted">Dibayar</dt>
                <dd className="font-semibold">{formatRp(view.paidAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted">Sisa kurang</dt>
                <dd
                  className={
                    view.sisa > 0
                      ? "font-semibold text-[var(--warning-fg)]"
                      : "font-semibold"
                  }
                >
                  {formatRp(view.sisa)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">
                  {view.creditOut > 0 ? "Kredit sisa" : "Utang akumulasi"}
                </dt>
                <dd
                  className={
                    view.creditOut > 0
                      ? "font-semibold text-accent-deep"
                      : view.totalDebt > 0
                        ? "font-semibold text-[var(--danger)]"
                        : "font-semibold"
                  }
                >
                  {formatRp(
                    view.creditOut > 0 ? view.creditOut : view.totalDebt,
                  )}
                </dd>
              </div>
            </dl>

            {debtIn > 0 ? (
              <p className="mt-2 text-[11px] text-muted">
                Termasuk utang minggu lalu {formatRp(debtIn)} + target{" "}
                {formatRp(view.baseTarget)}
              </p>
            ) : null}
            {creditIn > 0 ? (
              <p className="mt-2 text-[11px] text-muted">
                Kredit di muka {formatRp(creditIn)} menutup target{" "}
                {formatRp(view.baseTarget)}
                {view.due === 0
                  ? " · minggu ini tidak perlu bayar"
                  : ` · sisa tagihan ${formatRp(view.due)}`}
              </p>
            ) : null}
            {view.creditOut > 0 && creditIn === 0 ? (
              <p className="mt-2 text-[11px] text-muted">
                Kelebihan bayar {formatRp(view.creditOut)} dipakai otomatis di
                minggu berikutnya
              </p>
            ) : null}

            {editable ? (
              <div className="mt-3 border-t border-border pt-3">
                <PaymentEditor
                  userId={view.userId}
                  periodKey={view.periodKey}
                  iuranId={iuranId}
                  due={view.due}
                  paidAmount={view.paidAmount}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
