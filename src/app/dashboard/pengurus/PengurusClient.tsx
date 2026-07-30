"use client";

import { assignRole, deleteMember } from "@/app/actions/pengurus";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ROLE_LABEL, ROLES } from "@/lib/roles";
import type { AppRole, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Search, Trash2, Users } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ROLE_OPTIONS = ROLES.map((r) => ({
  value: r,
  label: ROLE_LABEL[r],
}));

function roleTone(
  role: AppRole | string,
): "accent" | "muted" | "warning" | "danger" {
  if (role === "ketua" || role === "wakil") return "accent";
  if (role === "guru") return "warning";
  if (role === "bendahara" || role === "sekretaris") return "accent";
  return "muted";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function PengurusClient({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Record<string, true>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null);
  const [deleting, startDelete] = useTransition();
  const inflight = useRef(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const role = ROLE_LABEL[u.role as AppRole] ?? u.role;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        (u.nis ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  function currentRole(u: Profile): string {
    return draft[u.id] ?? u.role;
  }

  function dirty(u: Profile): boolean {
    return currentRole(u) !== u.role;
  }

  function isSaving(id: string): boolean {
    return Boolean(savingIds[id]);
  }

  function canDelete(u: Profile): boolean {
    return u.id !== currentUserId;
  }

  async function save(u: Profile) {
    const role = currentRole(u);
    if (role === u.role || isSaving(u.id)) return;

    setSavingIds((prev) => ({ ...prev, [u.id]: true }));
    setToast(null);
    inflight.current += 1;

    try {
      const fd = new FormData();
      fd.set("userId", u.id);
      fd.set("role", role);
      await assignRole(fd);
      setDraft((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      setToast(`${u.name} → ${ROLE_LABEL[role as AppRole] ?? role}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSavingIds((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      inflight.current = Math.max(0, inflight.current - 1);
      if (inflight.current === 0) router.refresh();
    }
  }

  function confirmDelete() {
    if (!pendingDelete || deleting) return;
    const target = pendingDelete;
    startDelete(async () => {
      setToast(null);
      try {
        const fd = new FormData();
        fd.set("userId", target.id);
        await deleteMember(fd);
        setPendingDelete(null);
        setDraft((prev) => {
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
        setToast(`Dihapus: ${target.name}`);
        router.refresh();
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Gagal menghapus");
      }
    });
  }

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of users) {
      m.set(u.role, (m.get(u.role) ?? 0) + 1);
    }
    return m;
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pengurus
          </h1>
          <p className="mt-2 text-sm text-muted">
            Assign peran kelas atau hapus akun. Perubahan role aktif di sesi
            berikutnya.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Users className="size-3.5" aria-hidden />
          <span>{users.length} akun</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ROLES.filter((r) => (counts.get(r) ?? 0) > 0).map((r) => (
          <Badge key={r} tone={roleTone(r)} className="font-normal">
            {ROLE_LABEL[r]} · {counts.get(r)}
          </Badge>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted sm:left-3 sm:size-4"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, email, peran, NISN…"
          className="pl-8 sm:pl-9"
          aria-label="Cari akun"
        />
      </div>

      {toast ? (
        <p
          className="rounded-md border border-border bg-muted-bg px-3 py-2 text-xs text-muted"
          role="status"
        >
          {toast}
        </p>
      ) : null}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted-bg/60">
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                  Nama
                </th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                  Peran
                </th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                  NISN
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-muted"
                  >
                    {query.trim()
                      ? `Tidak ada akun cocok “${query.trim()}”.`
                      : "Belum ada akun."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const role = currentRole(u);
                  const isDirty = dirty(u);
                  const saving = isSaving(u.id);
                  const self = u.id === currentUserId;
                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        "border-b border-border last:border-b-0 transition-colors",
                        "hover:bg-muted-bg/40",
                        isDirty && "bg-accent-soft/30",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted-bg text-[11px] font-semibold text-muted"
                            aria-hidden
                          >
                            {initials(u.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium leading-tight">
                              {u.name}
                              {self ? (
                                <span className="ml-1.5 text-xs font-normal text-muted">
                                  (Anda)
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <Select
                            value={role}
                            onChange={(v) =>
                              setDraft((prev) => ({ ...prev, [u.id]: v }))
                            }
                            options={ROLE_OPTIONS}
                            disabled={saving || deleting}
                            className="w-full min-w-[160px]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted tabular-nums">
                        {u.nis || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={isDirty ? "primary" : "secondary"}
                            disabled={!isDirty || saving || deleting}
                            onClick={() => void save(u)}
                          >
                            {saving ? (
                              "…"
                            ) : (
                              <>
                                <Check className="size-3.5" aria-hidden />
                                Simpan
                              </>
                            )}
                          </Button>
                          {canDelete(u) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              disabled={saving || deleting}
                              onClick={() => setPendingDelete(u)}
                              aria-label={`Hapus ${u.name}`}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              Hapus
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <li className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted">
            {query.trim()
              ? `Tidak ada akun cocok “${query.trim()}”.`
              : "Belum ada akun."}
          </li>
        ) : (
          filtered.map((u) => {
            const role = currentRole(u);
            const isDirty = dirty(u);
            const saving = isSaving(u.id);
            const self = u.id === currentUserId;
            return (
              <li
                key={u.id}
                className={cn(
                  "rounded-lg border border-border bg-surface p-3.5",
                  isDirty && "border-accent/40 bg-accent-soft/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted-bg text-xs font-semibold text-muted"
                    aria-hidden
                  >
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {u.name}
                      {self ? (
                        <span className="ml-1 text-xs font-normal text-muted">
                          (Anda)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                    {u.nis ? (
                      <p className="mt-0.5 text-[11px] text-muted">
                        NISN {u.nis}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={roleTone(u.role)} className="shrink-0 font-normal">
                    {ROLE_LABEL[u.role as AppRole] ?? u.role}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Select
                    value={role}
                    onChange={(v) =>
                      setDraft((prev) => ({ ...prev, [u.id]: v }))
                    }
                    options={ROLE_OPTIONS}
                    disabled={saving || deleting}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={isDirty ? "primary" : "secondary"}
                    disabled={!isDirty || saving || deleting}
                    onClick={() => void save(u)}
                  >
                    {saving ? "…" : "Simpan"}
                  </Button>
                  {canDelete(u) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={saving || deleting}
                      onClick={() => setPendingDelete(u)}
                      aria-label={`Hapus ${u.name}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Hapus
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        title="Hapus akun?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” (${pendingDelete.email}) akan dihapus permanen: login, profil, status bayar, dan data yang dibuat akun ini.`
            : undefined
        }
      >
        <div className="space-y-4">
          {pendingDelete ? (
            <div className="rounded-md border border-border bg-muted-bg px-3 py-2 text-xs text-muted">
              <p>
                Peran:{" "}
                <span className="font-medium text-foreground">
                  {ROLE_LABEL[pendingDelete.role as AppRole] ??
                    pendingDelete.role}
                </span>
              </p>
              {pendingDelete.nis ? <p>NISN: {pendingDelete.nis}</p> : null}
              <p className="mt-1">Tindakan ini tidak bisa dibatalkan.</p>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={deleting || !pendingDelete}
              onClick={confirmDelete}
            >
              {deleting ? "Menghapus…" : "Ya, hapus permanen"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
