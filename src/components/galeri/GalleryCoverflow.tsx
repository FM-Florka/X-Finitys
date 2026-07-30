"use client";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  Share2,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

export type CoverflowPhoto = {
  id: string;
  url: string;
  caption: string | null;
};

const AUTO_MS = 3500;
const SWIPE_THRESHOLD = 48;

function Header() {
  return (
    <header className="mb-6 sm:mb-8">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
        Galeri
      </h2>
      <p className="mt-1 text-sm font-medium tracking-[0.14em] text-muted sm:text-base">
        X Finitys
      </p>
    </header>
  );
}

/** Full-photo lightbox (object-contain). Album name top bar with like/share/fav + close in image + close below caption. */
function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: CoverflowPhoto;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Reset decorative toggles when photo changes
  useEffect(() => {
    setLiked(false);
    setFavorited(false);
    setShareFlash(false);
  }, [photo.id]);

  if (!mounted) return null;

  const caption = photo.caption?.trim() || null;
  const albumName = "X Finitys"; // album name

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface relative z-[1] flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden p-0 shadow-[0_16px_48px_var(--float-shadow)]"
      >
        {/* Top bar: album name + like/share/fav (justify-between) */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="font-medium text-foreground truncate">{albumName}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={liked ? "Unlike" : "Like"}
              aria-pressed={liked}
              onClick={() => setLiked((v) => !v)}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md transition",
                liked
                  ? "text-[var(--danger)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Heart
                className={cn("size-4", liked && "fill-current")}
                aria-hidden
              />
            </button>
            <button
              type="button"
              aria-label="Share"
              onClick={() => {
                setShareFlash(true);
                window.setTimeout(() => setShareFlash(false), 1200);
              }}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md transition",
                shareFlash
                  ? "text-accent-deep"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Share2 className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={favorited ? "Hapus favorit" : "Favorit"}
              aria-pressed={favorited}
              onClick={() => setFavorited((v) => !v)}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md transition",
                favorited
                  ? "text-[var(--warning)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Star
                className={cn("size-4", favorited && "fill-current")}
                aria-hidden
              />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="relative flex items-center justify-center bg-muted-bg/50 px-2 py-3 sm:px-4 sm:py-4 flex-1 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={caption ?? "Foto galeri"}
              className="max-h-[min(68vh,680px)] w-auto max-w-full object-contain"
            />
          </div>

          {/* Caption at bottom */}
          <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
            <h2
              id={titleId}
              className={cn(
                "text-sm leading-relaxed sm:text-[15px]",
                caption ? "font-medium text-foreground" : "text-muted",
              )}
            >
              {caption || "Tanpa caption"}
            </h2>
            {/* Close button below caption, full width red */}
            <div className="mt-3">
              <button
                type="button"
                onClick={onClose}
                className="gummy-btn gummy-btn-danger w-full h-8 text-sm rounded-md"
                aria-label="Tutup"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function GalleryCoverflow({ photos }: { photos: CoverflowPhoto[] }) {
  const n = photos.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState<CoverflowPhoto | null>(null);

  // Keep active index in a ref so pointer handlers always see latest without rebinding
  const activeRef = useRef(active);
  activeRef.current = active;

  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (n === 0) return;
      setActive((i) => (i + dir + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (n <= 1 || paused || lightbox) return;
    const t = window.setInterval(() => go(1), AUTO_MS);
    return () => window.clearInterval(t);
  }, [go, n, paused, lightbox]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Don't capture — capture steals click from photo buttons.
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    setPaused(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = Math.abs(e.clientX - g.startX);
    const dy = Math.abs(e.clientY - g.startY);
    if (dx > 10 || dy > 10) g.moved = true;
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const moved = g.moved;
    gestureRef.current = null;
    setPaused(false);

    // Swipe left/right
    if (moved && Math.abs(dx) >= SWIPE_THRESHOLD) {
      go(dx < 0 ? 1 : -1);
      return;
    }

    // Tap: open lightbox if hit target is the active (center) photo button
    if (!moved) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const btn = el?.closest?.("[data-coverflow-index]") as HTMLElement | null;
      if (!btn) return;
      const idx = Number(btn.dataset.coverflowIndex);
      if (Number.isNaN(idx)) return;

      if (idx !== activeRef.current) {
        setActive(idx);
        return;
      }
      const photo = photos[idx];
      if (photo) setLightbox(photo);
    }
  };

  const onPointerCancel = () => {
    gestureRef.current = null;
    setPaused(false);
  };

  if (n === 0) {
    return (
      <section className="mt-4">
        <Header />
        <div className="flex flex-col items-center justify-center gap-3 border border-border bg-muted-bg/40 py-16 text-center">
          <Images className="size-10 text-muted opacity-50" aria-hidden />
          <p className="text-sm font-medium">Belum ada foto di galeri</p>
          <p className="max-w-sm text-xs text-muted">
            Unggah foto lewat dashboard untuk menampilkannya di sini.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mt-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <Header />

      <div className="relative mx-auto w-full max-w-5xl overflow-x-clip">
        <div
          className="relative mx-auto h-[min(72vw,300px)] w-full touch-pan-y select-none sm:h-[380px] md:h-[440px] lg:h-[480px]"
          style={{ perspective: "1200px" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: "preserve-3d" }}
          >
            {photos.map((photo, i) => {
              let offset = i - active;
              if (offset > n / 2) offset -= n;
              if (offset < -n / 2) offset += n;

              const abs = Math.abs(offset);
              const visible = abs <= 1;
              const isCenter = offset === 0;

              const scale = isCenter ? 1 : 0.7;
              const translateX = offset * 82;
              const rotateY = offset * -48;
              const z = isCenter ? 100 : 20;
              const opacity = isCenter ? 1 : visible ? 0.4 : 0;
              const blurPx = isCenter ? 0 : 3;

              return (
                <div
                  key={photo.id}
                  role="button"
                  tabIndex={visible ? 0 : -1}
                  data-coverflow-index={i}
                  aria-label={photo.caption ?? `Foto ${i + 1}`}
                  aria-current={isCenter ? "true" : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (i !== active) setActive(i);
                      else setLightbox(photo);
                    }
                  }}
                  className={cn(
                    "absolute aspect-square origin-center cursor-pointer overflow-hidden rounded-none border border-border bg-muted-bg transition-[transform,opacity,filter] duration-500 ease-out",
                    "h-[min(62vw,240px)] w-[min(62vw,240px)] sm:h-[300px] sm:w-[300px] md:h-[360px] md:w-[360px] lg:h-[400px] lg:w-[400px]",
                    isCenter &&
                      "border-[var(--border-strong)] shadow-[0_18px_50px_rgba(0,0,0,0.2)]",
                    !visible && "pointer-events-none",
                  )}
                  style={{
                    transform: `translateX(${translateX}%) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: z,
                    filter: blurPx > 0 ? `blur(${blurPx}px)` : "none",
                  }}
                >
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? "Foto galeri"}
                      fill
                      className="pointer-events-none object-cover"
                      sizes="(max-width:640px) 62vw, (max-width:768px) 300px, (max-width:1024px) 360px, 400px"
                      unoptimized
                      priority={isCenter}
                      draggable={false}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {n > 1 ? (
            <>
              <button
                type="button"
                aria-label="Foto sebelumnya"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute left-0 top-1/2 z-30 hidden -translate-y-1/2 rounded-none border border-border bg-surface/95 p-2 text-foreground backdrop-blur-sm transition hover:bg-muted-bg sm:left-1 sm:block sm:p-2.5"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute right-0 top-1/2 z-30 hidden -translate-y-1/2 rounded-none border border-border bg-surface/95 p-2 text-foreground backdrop-blur-sm transition hover:bg-muted-bg sm:right-1 sm:block sm:p-2.5"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>

        {n > 1 ? (
          <div className="mt-5 flex items-center justify-center gap-1.5 sm:mt-6">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Ke foto ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active
                    ? "w-5 bg-accent"
                    : "w-1.5 bg-border hover:bg-muted",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {lightbox ? (
        <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />
      ) : null}
    </section>
  );
}
