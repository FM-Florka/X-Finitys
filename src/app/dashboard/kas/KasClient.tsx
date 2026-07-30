"use client";

import { DeleteIuranButton } from "@/app/dashboard/kas/DeleteIuranButton";
import { IuranForm } from "@/app/dashboard/kas/IuranForm";
import { StudentPayCard } from "@/app/dashboard/kas/StudentPayCard";
import { TransactionForm } from "@/app/dashboard/kas/TransactionForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { buildRutinViews, type StudentPayView } from "@/lib/kas";
import { ROLE_LABEL } from "@/lib/roles";
import type { AppRole, Iuran, PaymentStatus, Profile, Transaction } from "@/lib/types";
import {
  formatDate,
  formatPeriodLabel,
  formatRp,
  KAS_RUTIN_TARGET,
} from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE_MOBILE = 3;
const PAGE_SIZE_DESKTOP = 6;

type PeriodOption = {
  key: string;
  isCurrent: boolean;
  lunas: number;
  total: number;
  collected: number;
  debt: number;
};

type IuranBlock = {
  iuran: Iuran;
  views: StudentPayView[];
  paidCount: number;
  collected: number;
};

function usePageSize() {
  const [size, setSize] = useState(PAGE_SIZE_DESKTOP);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () =>
      setSize(mq.matches ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return size;
}

export function KasClient({
  editable,
  roleLabel,
  loadErrors = [],
  saldo,
  income,
  expense,
  currentPeriod,
  periodOptions,
  students,
  payments,
  iuranBlocks,
  iurans,
  txs,
}: {
  editable: boolean;
  roleLabel?: string;
  loadErrors?: string[];
  saldo: number;
  income: number;
  expense: number;
  currentPeriod: string;
  periodOptions: PeriodOption[];
  students: Profile[];
  payments: PaymentStatus[];
  iuranBlocks: IuranBlock[];
  iurans: Pick<Iuran, "id" | "name">[];
  txs: Transaction[];
}) {
  const [txOpen, setTxOpen] = useState(false);
  const [iuranOpen, setIuranOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [iuranPage, setIuranPage] = useState<Record<string, number>>({});
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const pageSize = usePageSize();

  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  );
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const rutinViews = useMemo(
    () =>
      buildRutinViews(studentIds, selectedPeriod, payments, KAS_RUTIN_TARGET),
    [studentIds, selectedPeriod, payments],
  );

  const lunasCount = rutinViews.filter((v) => v.state === "lunas").length;
  const totalDebtSum = rutinViews.reduce((s, v) => s + v.totalDebt, 0);
  const isCurrentPeriod = selectedPeriod === currentPeriod;

  const periodSelectOptions = useMemo(
    () =>
      periodOptions.map((p) => ({
        value: p.key,
        label: p.isCurrent
          ? `${formatPeriodLabel(p.key)} · minggu ini`
          : `${formatPeriodLabel(p.key)} · lunas ${p.lunas}/${p.total}`,
      })),
    [periodOptions],
  );

  const filteredRutin = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rutinViews;
    return rutinViews.filter((v) => {
      const s = studentById.get(v.userId);
      if (!s) return false;
      const role = ROLE_LABEL[s.role as AppRole] ?? s.role;
      return (
        s.name.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        (s.nis ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, rutinViews, studentById]);

  const totalPages = Math.max(1, Math.ceil(filteredRutin.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [query, selectedPeriod, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRutin = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRutin.slice(start, start + pageSize);
  }, [filteredRutin, page, pageSize]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Kas kelas
          </h1>
          <p className="mt-2 text-sm text-muted">
            {editable
              ? "Kelola pemasukan, pengeluaran, iuran, dan status bayar."
              : "Laporan kas (read-only) untuk transparansi."}
          </p>
        </div>
        {editable ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={() => setIuranOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Iuran khusus
            </Button>
            <Button
              type="button"
              className="flex-1 sm:flex-none"
              onClick={() => setTxOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Catat transaksi
            </Button>
          </div>
        ) : (
          <Badge tone="muted" className="w-fit font-normal">
            Read-only
            {roleLabel ? ` · ${roleLabel}` : ""}
          </Badge>
        )}
      </div>

      {loadErrors.length > 0 ? (
        <div
          className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-fg)]"
          role="alert"
        >
          <p className="font-semibold">Gagal memuat sebagian data kas</p>
          <ul className="mt-1 list-disc pl-4 text-xs">
            {loadErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!editable ? (
        <p className="rounded-md border border-border bg-muted-bg px-3 py-2 text-xs text-muted">
          Mode baca. Tombol iuran / transaksi / edit bayar hanya untuk Ketua,
          Wakil, Bendahara, atau Guru. Login dengan akun editor atau ubah peran
          di Pengurus.
        </p>
      ) : null}

      {/* Modals selalu di-mount untuk editor — di luar conditional layout */}
      {editable ? (
        <>
          <Modal
            open={txOpen}
            onClose={() => setTxOpen(false)}
            title="Catat transaksi"
            description="Pemasukan / pengeluaran masuk riwayat"
          >
            <TransactionForm iurans={iurans} onClose={() => setTxOpen(false)} />
          </Modal>
          <Modal
            open={iuranOpen}
            onClose={() => setIuranOpen(false)}
            title="Buat iuran khusus"
            description="Acara, study tour, dll"
          >
            <IuranForm onClose={() => setIuranOpen(false)} />
          </Modal>
        </>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-12">
        <Card
          variant="hero"
          className="flex min-h-[180px] flex-col justify-between p-6 sm:p-8 lg:col-span-7"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Saldo total
          </p>
          <p
            className={`mt-3 text-4xl font-semibold tracking-tight sm:text-5xl ${
              saldo >= 0 ? "text-accent-deep" : "text-[var(--danger)]"
            }`}
          >
            {formatRp(saldo)}
          </p>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <Card variant="metric" className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Pemasukan
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-accent-deep">
              {formatRp(income)}
            </p>
          </Card>
          <Card variant="metric" className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Pengeluaran
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {formatRp(expense)}
            </p>
          </Card>
        </div>
      </section>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>Iuran khusus</CardTitle>
            <CardDesc>
              {editable
                ? "Buat / hapus iuran · catat bayar per siswa"
                : "Daftar iuran aktif (read-only)"}
            </CardDesc>
          </div>
          {editable ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIuranOpen(true)}
            >
              <Plus className="size-3.5" aria-hidden />
              Buat iuran
            </Button>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {iuranBlocks.length === 0 ? (
            <Empty
              title="Belum ada iuran"
              description={
                editable
                  ? "Klik “Buat iuran” untuk menambah iuran khusus."
                  : "Belum ada iuran yang dibuat."
              }
            />
          ) : (
            iuranBlocks.map(({ iuran: i, views, paidCount, collected }) => (
              <div key={i.id} className="row-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{i.name}</p>
                      <Badge>{i.active ? "Aktif" : "Selesai"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Target {formatRp(i.target_amount)}/siswa
                      {i.deadline ? ` · tenggat ${formatDate(i.deadline)}` : ""}
                    </p>
                    {i.description ? (
                      <p className="mt-1 text-sm text-muted">{i.description}</p>
                    ) : null}
                    <p className="mt-1 text-sm">
                      Lunas: <strong>{paidCount}</strong> / {students.length} ·
                      terkumpul {formatRp(collected)}
                    </p>
                  </div>
                  {editable ? (
                    <DeleteIuranButton iuranId={i.id} name={i.name} />
                  ) : null}
                </div>

                <IuranStudentsGrid
                  views={views}
                  studentById={studentById}
                  editable={editable}
                  iuranId={i.id}
                  page={iuranPage[i.id] ?? 1}
                  pageSize={pageSize}
                  onPageChange={(p) =>
                    setIuranPage((prev) => ({ ...prev, [i.id]: p }))
                  }
                />
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Rekap kas rutin</CardTitle>
            <CardDesc>
              Target {formatRp(KAS_RUTIN_TARGET)}/minggu · utang numpuk ke minggu
              berikutnya · data tiap minggu tersimpan
            </CardDesc>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {isCurrentPeriod ? <Badge tone="accent">Minggu ini</Badge> : null}
            <Badge tone="accent">
              Lunas {lunasCount}/{students.length}
            </Badge>
            {totalDebtSum > 0 ? (
              <Badge tone="warning">Utang total {formatRp(totalDebtSum)}</Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted sm:left-3 sm:size-4"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari siswa (nama, role, NISN)…"
              className="pl-8 sm:pl-9"
              aria-label="Cari siswa"
            />
          </div>
          <Select
            value={selectedPeriod}
            onChange={(v) => setSelectedPeriod(v)}
            options={periodSelectOptions}
            placeholder="Pilih minggu"
            className="w-full"
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRutin.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3">
              <Empty
                title={query.trim() ? "Tidak ketemu" : "Belum ada siswa"}
                description={
                  query.trim()
                    ? `Tidak ada siswa cocok dengan “${query.trim()}”.`
                    : undefined
                }
              />
            </div>
          ) : (
            pagedRutin.map((v) => {
              const s = studentById.get(v.userId);
              if (!s) return null;
              return (
                <StudentPayCard
                  key={`${selectedPeriod}-${s.id}`}
                  name={s.name}
                  role={s.role}
                  view={v}
                  editable={editable}
                />
              );
            })
          )}
        </div>

        {filteredRutin.length > 0 ? (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={filteredRutin.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        ) : null}
      </Card>

      <Card className="p-6">
        <CardTitle>Riwayat transaksi</CardTitle>
        <CardDesc>
          Log kronologis pemasukan & pengeluaran · read-only untuk semua
        </CardDesc>
        {txs.length === 0 ? (
          <div className="mt-4">
            <Empty
              title="Belum ada transaksi"
              description={
                editable
                  ? "Klik “Catat transaksi” agar riwayat terisi."
                  : "Belum ada data yang dicatat."
              }
            />
            {editable ? (
              <div className="mt-3 flex justify-center">
                <Button type="button" size="sm" onClick={() => setTxOpen(true)}>
                  <Receipt className="size-3.5" aria-hidden />
                  Catat transaksi
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {txs.map((t) => (
              <li
                key={t.id}
                className="row-soft flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted-bg">
                    <Wallet className="size-3.5 text-muted" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {t.note || t.iuran?.name || labelKind(t.kind)}
                    </p>
                    <p className="text-xs text-muted">
                      <span className="capitalize">{t.type}</span>
                      {" · "}
                      {labelKind(t.kind)}
                      {" · "}
                      {formatDate(t.date)}
                      {" · "}
                      {t.creator?.name ?? "—"}
                    </p>
                  </div>
                </div>
                <p
                  className={
                    t.type === "pemasukan"
                      ? "font-semibold text-accent-deep"
                      : "font-semibold text-[var(--danger)]"
                  }
                >
                  {t.type === "pemasukan" ? "+" : "−"}
                  {formatRp(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function labelKind(kind: string): string {
  if (kind === "rutin") return "Kas rutin";
  if (kind === "iuran") return "Iuran khusus";
  return "Lainnya";
}

function IuranStudentsGrid({
  views,
  studentById,
  editable,
  iuranId,
  page,
  pageSize,
  onPageChange,
}: {
  views: StudentPayView[];
  studentById: Map<string, Profile>;
  editable: boolean;
  iuranId: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(views.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = views.slice(start, start + pageSize);

  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages);
  }, [page, totalPages, onPageChange]);

  return (
    <>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {slice.map((v) => {
          const s = studentById.get(v.userId);
          if (!s) return null;
          return (
            <StudentPayCard
              key={v.userId}
              name={s.name}
              role={s.role}
              view={v}
              editable={editable}
              iuranId={iuranId}
            />
          );
        })}
      </div>
      {views.length > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          totalItems={views.length}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-3 text-center text-xs text-muted">{totalItems} siswa</p>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <p className="text-xs text-muted">
        {from}–{to} dari {totalItems}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Prev
        </Button>
        <span className="min-w-16 text-center text-xs font-medium tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
