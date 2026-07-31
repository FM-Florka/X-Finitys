"use client";

import {
  addPhoto,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  updatePhotoCaption,
} from "@/app/actions/galeri";
import { FileDropzone } from "@/components/galeri/FileDropzone";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDesc, CardTitle } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { cn, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  ImageIcon,
  Images,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type AlbumCardData = {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  cover_url: string | null;
  event_date: string | null;
  created_at: string;
  photo_count: number;
};

export type PhotoCardData = {
  id: string;
  album_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  url: string | null;
};

type FormTab = "album" | "foto" | null;

export function GaleriManager({
  initialAlbums,
  initialPhotos,
  editable,
}: {
  initialAlbums: AlbumCardData[];
  initialPhotos: PhotoCardData[];
  editable: boolean;
}) {
  const router = useRouter();
  const albums = initialAlbums;
  const photos = initialPhotos;
  const [formTab, setFormTab] = useState<FormTab>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form reset keys → remount FileDropzone
  const [albumReset, setAlbumReset] = useState(0);
  const [photoReset, setPhotoReset] = useState(0);

  // Photo form
  const [photoAlbumId, setPhotoAlbumId] = useState("");
  const [justUploaded, setJustUploaded] = useState<PhotoCardData[]>([]);

  // Detail ops
  const [deleteAlbumOpen, setDeleteAlbumOpen] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<PhotoCardData | null>(null);
  const [editCaption, setEditCaption] = useState("");

  const selectedAlbum = useMemo(
    () => albums.find((a) => a.id === selectedId) ?? null,
    [albums, selectedId],
  );

  const selectedPhotos = useMemo(() => {
    if (!selectedId) return [];
    return photos
      .filter((p) => p.album_id === selectedId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [photos, selectedId]);

  const photoAlbum = useMemo(
    () => albums.find((a) => a.id === photoAlbumId) ?? null,
    [albums, photoAlbumId],
  );

  const openForm = (tab: "album" | "foto") => {
    setError(null);
    setJustUploaded([]);
    setFormTab(tab);
    if (tab === "foto" && selectedId) setPhotoAlbumId(selectedId);
  };

  const handleCreateAlbum = (fd: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const created = await createAlbum(fd);
        setAlbumReset((n) => n + 1);
        setFormTab(null);
        setSelectedId(created.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal buat album");
      }
    });
  };

  const handleAddPhoto = (fd: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const created = await addPhoto(fd);
        const card: PhotoCardData = {
          id: created.id,
          album_id: created.album_id,
          storage_path: created.storage_path,
          caption: created.caption,
          created_at: created.created_at,
          url: created.url,
        };
        setJustUploaded((prev) => [card, ...prev]);
        setPhotoReset((n) => n + 1);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal unggah foto");
      }
    });
  };

  const handleDeleteAlbum = () => {
    if (!selectedAlbum) return;
    setError(null);
    const id = selectedAlbum.id;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("albumId", id);
        await deleteAlbum(fd);
        setSelectedId(null);
        setDeleteAlbumOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal hapus album");
      }
    });
  };

  const handleDeletePhoto = () => {
    if (!deletePhotoId) return;
    const id = deletePhotoId;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("photoId", id);
        await deletePhoto(fd);
        setJustUploaded((prev) => prev.filter((p) => p.id !== id));
        setDeletePhotoId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal hapus foto");
      }
    });
  };

  const handleSaveCaption = () => {
    if (!editPhoto) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("photoId", editPhoto.id);
        fd.set("caption", editCaption);
        await updatePhotoCaption(fd);
        const next = editCaption.trim() || null;
        setJustUploaded((prev) =>
          prev.map((p) =>
            p.id === editPhoto.id ? { ...p, caption: next } : p,
          ),
        );
        setEditPhoto(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal simpan caption");
      }
    });
  };

  /* ─── Album detail ─────────────────────────────────────────── */
  if (selectedAlbum) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setError(null);
              }}
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-accent-deep hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Kembali ke album
            </button>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {selectedAlbum.title}
            </h1>
            {selectedAlbum.description ? (
              <p className="mt-1 text-sm text-muted">
                {selectedAlbum.description}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge tone="muted">{selectedAlbum.photo_count} foto</Badge>
              <span>
                {formatDate(
                  selectedAlbum.event_date ?? selectedAlbum.created_at,
                )}
              </span>
            </div>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => openForm("foto")}
              >
                <Upload className="size-3.5" aria-hidden />
                Tambah foto
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => setDeleteAlbumOpen(true)}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Hapus album
              </Button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-md border border-danger/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {error}
          </p>
        ) : null}

        {editable && formTab === "foto" ? (
          <PhotoFormCard
            albums={albums}
            albumId={photoAlbumId || selectedAlbum.id}
            onAlbumChange={setPhotoAlbumId}
            photoAlbum={
              albums.find((a) => a.id === (photoAlbumId || selectedAlbum.id)) ??
              selectedAlbum
            }
            pending={pending}
            photoReset={photoReset}
            justUploaded={justUploaded.filter(
              (p) => p.album_id === (photoAlbumId || selectedAlbum.id),
            )}
            onSubmit={handleAddPhoto}
            onClose={() => {
              setFormTab(null);
              setJustUploaded([]);
            }}
          />
        ) : null}

        {selectedPhotos.length === 0 ? (
          <Empty
            title="Album kosong"
            description={
              editable
                ? "Unggah foto pertama lewat tombol Tambah foto."
                : "Belum ada foto di album ini."
            }
          />
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {selectedPhotos.map((photo) => (
              <figure
                key={photo.id}
                className="group surface relative overflow-hidden"
              >
                <div className="relative aspect-square bg-muted-bg">
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? selectedAlbum.title}
                      fill
                      className="object-cover"
                      sizes="(max-width:640px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted opacity-40">
                      <ImageIcon className="size-8" aria-hidden />
                    </div>
                  )}

                  {/* Actions — top right */}
                  {editable ? (
                    <div
                      className={
                        "pointer-events-none absolute right-1.5 top-1.5 z-10 flex gap-1 " +
                        "opacity-0 transition duration-200 ease-out " +
                        "group-hover:opacity-100 group-focus-within:opacity-100 " +
                        "max-sm:opacity-100"
                      }
                    >
                      <button
                        type="button"
                        title="Edit caption"
                        onClick={() => {
                          setEditPhoto(photo);
                          setEditCaption(photo.caption ?? "");
                        }}
                        className="pointer-events-auto rounded-md bg-surface/95 p-1.5 text-foreground border border-border shadow-sm hover:bg-muted-bg"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        title="Hapus foto"
                        onClick={() => setDeletePhotoId(photo.id)}
                        className="pointer-events-auto rounded-md bg-surface/95 p-1.5 text-[var(--danger-fg)] border border-border shadow-sm hover:bg-[var(--danger-soft)]"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : null}

                  {/* Caption + gradient — bottom, slide up on hover */}
                  <div
                    className={
                      "pointer-events-none absolute inset-x-0 bottom-0 " +
                      "bg-gradient-to-t from-black/75 via-black/40 to-transparent " +
                      "px-2.5 pb-2.5 pt-12 " +
                      "translate-y-3 opacity-0 transition duration-200 ease-out " +
                      "group-hover:translate-y-0 group-hover:opacity-100 " +
                      "group-focus-within:translate-y-0 group-focus-within:opacity-100 " +
                      "max-sm:translate-y-0 max-sm:opacity-100"
                    }
                  >
                    {photo.caption ? (
                      <figcaption
                        title={photo.caption}
                        className="line-clamp-2 text-left text-sm font-medium leading-snug text-white drop-shadow-sm"
                      >
                        {photo.caption}
                      </figcaption>
                    ) : null}
                  </div>
                </div>
              </figure>
            ))}
          </div>
        )}

        <Modal
          open={deleteAlbumOpen}
          onClose={() => setDeleteAlbumOpen(false)}
          title="Hapus album?"
          description={`Album “${selectedAlbum.title}” dan semua fotonya akan dihapus permanen.`}
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteAlbumOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={pending}
              onClick={handleDeleteAlbum}
            >
              {pending ? "Menghapus…" : "Ya, hapus album"}
            </Button>
          </div>
        </Modal>

        <Modal
          open={Boolean(deletePhotoId)}
          onClose={() => setDeletePhotoId(null)}
          title="Hapus foto?"
          description="Foto dihapus permanen dari album dan storage."
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeletePhotoId(null)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={pending}
              onClick={handleDeletePhoto}
            >
              {pending ? "Menghapus…" : "Ya, hapus"}
            </Button>
          </div>
        </Modal>

        <Modal
          open={Boolean(editPhoto)}
          onClose={() => setEditPhoto(null)}
          title="Edit caption"
          description="Keterangan singkat di bawah foto."
        >
          <div className="space-y-3">
            {editPhoto?.url ? (
              <div className="relative mx-auto aspect-square w-full max-w-[180px] overflow-hidden rounded-md border border-border bg-muted-bg">
                <Image
                  src={editPhoto.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="180px"
                  unoptimized
                />
              </div>
            ) : null}
            <Field label="Caption" htmlFor="edit-caption">
              <Input
                id="edit-caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Opsional"
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditPhoto(null)}
                disabled={pending}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                loading={pending}
                onClick={handleSaveCaption}
              >
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  /* ─── List view ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {editable ? "Kelola galeri" : "Galeri"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {editable
              ? "Album visual, unggah drag-and-drop, kelola foto per album."
              : "Daftar album kelas (read-only)."}
          </p>
        </div>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={formTab === "album" ? "primary" : "secondary"}
              onClick={() =>
                formTab === "album" ? setFormTab(null) : openForm("album")
              }
            >
              <Plus className="size-3.5" aria-hidden />
              Album baru
            </Button>
            <Button
              type="button"
              size="sm"
              variant={formTab === "foto" ? "primary" : "secondary"}
              onClick={() =>
                formTab === "foto" ? setFormTab(null) : openForm("foto")
              }
              disabled={albums.length === 0}
            >
              <Upload className="size-3.5" aria-hidden />
              Tambah foto
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {error}
        </p>
      ) : null}

      {editable && formTab ? (
        <div className="space-y-3">
          <div className="flex gap-1 border-b border-border">
            {(
              [
                { key: "album" as const, label: "Album baru", icon: Plus },
                { key: "foto" as const, label: "Tambah foto", icon: Upload },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => openForm(key)}
                disabled={key === "foto" && albums.length === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition -mb-px",
                  formTab === key
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {formTab === "album" ? (
            <Card>
              <CardTitle>Album baru</CardTitle>
              <CardDesc>Judul + cover opsional. Tampil di galeri publik.</CardDesc>
              <form action={handleCreateAlbum} className="mt-4 space-y-3">
                <Field label="Judul" htmlFor="title">
                  <Input
                    id="title"
                    name="title"
                    required
                    placeholder="Mis. Study Tour 2026"
                  />
                </Field>
                <Field label="Deskripsi" htmlFor="description">
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Opsional"
                  />
                </Field>
                <Field label="Cover album" htmlFor="cover">
                  <FileDropzone
                    key={albumReset}
                    name="cover"
                    label="Tarik foto ke sini atau klik untuk pilih"
                    hint="Cover opsional · bisa diganti nanti lewat foto pertama"
                  />
                </Field>
                <Field label="Tanggal acara" htmlFor="eventDate">
                  <DatePicker id="eventDate" name="eventDate" placeholder="Pilih tanggal acara" />
                </Field>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="submit" loading={pending}>
                    {pending ? "Menyimpan…" : "Buat album"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setFormTab(null)}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <PhotoFormCard
              albums={albums}
              albumId={photoAlbumId}
              onAlbumChange={setPhotoAlbumId}
              photoAlbum={photoAlbum}
              pending={pending}
              photoReset={photoReset}
              justUploaded={justUploaded}
              onSubmit={handleAddPhoto}
              onClose={() => {
                setFormTab(null);
                setJustUploaded([]);
              }}
            />
          )}
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Album terdaftar
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {editable
                ? "Klik kartu untuk kelola foto di dalamnya"
                : "Preview album kelas"}
            </p>
          </div>
          <Badge tone="muted">{albums.length} album</Badge>
        </div>

        {albums.length === 0 ? (
          <Empty
            title="Belum ada album"
            description={
              editable
                ? "Buat album pertama lewat tombol Album baru di atas."
                : "Pengurus belum menambahkan album."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => {
                  setSelectedId(album.id);
                  setError(null);
                  setFormTab(null);
                }}
                className="group surface overflow-hidden text-left transition hover:border-[var(--border-strong)]"
              >
                <div className="relative aspect-[16/10] bg-muted-bg">
                  {album.cover_url ? (
                    <Image
                      src={album.cover_url}
                      alt={album.title}
                      fill
                      className="object-cover transition group-hover:scale-[1.02]"
                      sizes="(max-width:768px) 100vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-muted opacity-50">
                      <Images className="size-9" aria-hidden />
                      <span className="text-xs">Tanpa cover</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug">{album.title}</h3>
                    <Badge tone="muted">{album.photo_count} foto</Badge>
                  </div>
                  {album.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {album.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">
                    {formatDate(album.event_date ?? album.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoFormCard({
  albums,
  albumId,
  onAlbumChange,
  photoAlbum,
  pending,
  photoReset,
  justUploaded,
  onSubmit,
  onClose,
}: {
  albums: AlbumCardData[];
  albumId: string;
  onAlbumChange: (id: string) => void;
  photoAlbum: AlbumCardData | null;
  pending: boolean;
  photoReset: number;
  justUploaded: PhotoCardData[];
  onSubmit: (fd: FormData) => void;
  onClose: () => void;
}) {
  const albumOptions = albums.map((a) => ({
    value: a.id,
    label: `${a.title} (${a.photo_count} foto)`,
  }));

  return (
    <Card>
      <CardTitle>Tambah foto</CardTitle>
      <CardDesc>Pilih album, unggah, caption opsional.</CardDesc>
      <form action={onSubmit} className="mt-4 space-y-3">
        <Field label="Album" htmlFor="albumId">
          <Select
            id="albumId"
            name="albumId"
            required
            value={albumId}
            onChange={onAlbumChange}
            options={albumOptions}
            placeholder="Pilih album…"
          />
        </Field>

        {photoAlbum ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted-bg p-2.5">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
              {photoAlbum.cover_url ? (
                <Image
                  src={photoAlbum.cover_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted opacity-40">
                  <ImageIcon className="size-5" aria-hidden />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{photoAlbum.title}</p>
              <p className="text-xs text-muted">
                {photoAlbum.photo_count} foto ·{" "}
                {formatDate(photoAlbum.event_date ?? photoAlbum.created_at)}
              </p>
            </div>
          </div>
        ) : null}

        <Field label="Foto" htmlFor="photo">
          <FileDropzone
            key={photoReset}
            name="photo"
            required
            label="Tarik foto ke sini atau klik untuk pilih"
          />
        </Field>
        <Field label="Caption" htmlFor="caption">
          <Input id="caption" name="caption" placeholder="Opsional" />
        </Field>

        {justUploaded.length > 0 ? (
          <div className="space-y-2 rounded-md border border-accent/25 bg-accent-soft/30 p-3">
            <p className="text-xs font-medium text-accent-fg">
              Baru diunggah ({justUploaded.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {justUploaded.map((p) => (
                <div
                  key={p.id}
                  className="relative size-16 overflow-hidden rounded-md border border-border bg-muted-bg"
                  title={p.caption ?? undefined}
                >
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.caption ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" loading={pending} disabled={!albumId}>
            {pending ? "Mengunggah…" : "Tambah foto"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>
      </form>
    </Card>
  );
}
