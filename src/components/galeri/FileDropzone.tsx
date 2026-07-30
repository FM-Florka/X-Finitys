"use client";

import { cn } from "@/lib/utils";
import { ImagePlus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

export function FileDropzone({
  name,
  accept = "image/*",
  required = false,
  label = "Tarik foto ke sini atau klik untuk pilih",
  hint,
  className,
  onFileChange,
  previewUrl: controlledPreview,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  onFileChange?: (file: File | null) => void;
  /** Preview eksternal (mis. cover album terpilih) — tidak set file input */
  previewUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const localPreview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const applyFile = useCallback(
    (next: File | null) => {
      if (next && !next.type.startsWith("image/")) return;
      setFile(next);
      onFileChange?.(next);
      if (inputRef.current) {
        if (!next) {
          inputRef.current.value = "";
        } else {
          const dt = new DataTransfer();
          dt.items.add(next);
          inputRef.current.files = dt.files;
        }
      }
    },
    [onFileChange],
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    applyFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    applyFile(f);
  };

  const preview = localPreview ?? controlledPreview ?? null;
  const showClear = Boolean(file);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed px-4 py-6 text-center transition",
          dragging
            ? "border-accent bg-accent-soft/40"
            : "border-border bg-muted-bg hover:border-[var(--border-strong)]",
          preview && "p-0",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          required={required && !file}
          className="sr-only"
          onChange={onInputChange}
        />

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="mb-2 flex size-10 items-center justify-center rounded-md border border-border bg-surface text-muted">
              <ImagePlus className="size-5" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            {hint ? (
              <p className="mt-1 text-xs text-muted">{hint}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">JPG, PNG, WebP · maks wajar</p>
            )}
          </>
        )}

        {preview && !showClear ? (
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent p-3">
            <span className="text-xs font-medium text-white">
              Klik / tarik untuk ganti
            </span>
          </div>
        ) : null}
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyFile(null);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 hover:bg-muted-bg hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
            Hapus
          </button>
        </div>
      ) : null}
    </div>
  );
}
