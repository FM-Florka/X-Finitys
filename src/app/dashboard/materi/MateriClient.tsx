"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMateri, getMateriUrl, uploadMateri } from "@/app/actions/materi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Material } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Download, FileText, Trash2, Upload } from "lucide-react";

function formatBytes(n: number | null | undefined): string {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MateriClient({
  materials,
  currentUserId,
  canUpload,
  canDeleteAny,
  loadError,
}: {
  materials: Material[];
  currentUserId: string;
  canUpload: boolean;
  canDeleteAny: boolean;
  loadError: string | null;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const m of materials) {
      if (m.subject?.trim()) set.add(m.subject.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [materials]);

  const filtered = useMemo(() => {
    if (subjectFilter === "all") return materials;
    return materials.filter((m) => (m.subject ?? "").trim() === subjectFilter);
  }, [materials, subjectFilter]);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await uploadMateri(formData);
      setFormOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah materi");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus materi ini?")) return;
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    try {
      await deleteMateri(fd);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus materi");
    }
  }

  async function download(m: Material) {
    setError(null);
    setDownloading(m.id);
    try {
      const url = await getMateriUrl(m.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat tautan unduhan");
    } finally {
      setDownloading(null);
    }
  }

  function canDelete(m: Material): boolean {
    return canDeleteAny || m.uploaded_by === currentUserId;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materi</h1>
          <p className="mt-1 text-sm text-muted">
            File pelajaran kelas. Semua anggota boleh unduh; unggah max 25 MB.
          </p>
        </div>
        {canUpload ? (
          <Button onClick={() => setFormOpen(true)}>
            <Upload className="size-4" aria-hidden />
            Unggah materi
          </Button>
        ) : null}
      </div>

      {loadError ? (
        <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          Gagal memuat data: {loadError}. Pastikan migration{" "}
          <code>014_attendance_materials.sql</code> sudah dijalankan.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]"
        >
          {error}
        </p>
      ) : null}

      {subjects.length > 0 ? (
        <nav className="flex flex-wrap gap-1 border-b border-border">
          <button
            onClick={() => setSubjectFilter("all")}
            aria-current={subjectFilter === "all" ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              subjectFilter === "all"
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            }`}
          >
            Semua
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              aria-current={subjectFilter === s ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                subjectFilter === s
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:border-border hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </nav>
      ) : null}

      <Card padded={false}>
        <div className="border-b border-border px-5 py-4">
          <CardTitle>Daftar materi</CardTitle>
          <CardDesc>
            {filtered.length} file
            {subjectFilter !== "all" ? ` · ${subjectFilter}` : ""}.
          </CardDesc>
        </div>
        {filtered.length === 0 ? (
          <Empty
            title="Belum ada materi"
            description="Unggah PDF, slide, atau dokumen pelajaran agar teman sekelas bisa unduh."
            className="m-5"
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted-bg text-muted">
                    <FileText className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {m.file_name}
                      {" · "}
                      {formatBytes(m.file_size)}
                      {" · "}
                      {formatDateTime(m.created_at)}
                      {m.uploader?.name ? ` · ${m.uploader.name}` : ""}
                    </p>
                    {m.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {m.description}
                      </p>
                    ) : null}
                    {m.subject ? (
                      <div className="mt-1.5">
                        <Badge tone="muted">{m.subject}</Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => download(m)}
                    loading={downloading === m.id}
                    aria-label={`Unduh ${m.title}`}
                  >
                    <Download className="size-4" aria-hidden />
                    Unduh
                  </Button>
                  {canDelete(m) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(m.id)}
                      aria-label={`Hapus ${m.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Unggah materi"
        description="PDF, dokumen, atau slide. Maksimal 25 MB."
      >
        <form action={submit} className="space-y-4">
          <Field label="Judul" htmlFor="title">
            <Input
              id="title"
              name="title"
              required
              placeholder="Misal: Ringkasan Bab 3 Matematika"
            />
          </Field>
          <Field label="Mata pelajaran (opsional)" htmlFor="subject">
            <Input
              id="subject"
              name="subject"
              placeholder="Misal: Matematika"
              list="materi-subjects"
            />
            {subjects.length > 0 ? (
              <datalist id="materi-subjects">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            ) : null}
          </Field>
          <Field label="Deskripsi (opsional)" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              placeholder="Catatan singkat untuk teman sekelas"
            />
          </Field>
          <Field label="File" htmlFor="file">
            <Input
              id="file"
              name="file"
              type="file"
              required
              className="file:mr-3 file:rounded-md file:border-0 file:bg-muted-bg file:px-2 file:py-1 file:text-xs file:text-foreground"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" loading={pending}>
              {pending ? "Mengunggah…" : "Unggah"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
