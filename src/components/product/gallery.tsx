"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Minimize2, ZoomIn } from "lucide-react";

export type GalleryImage = { url: string; alt: string | null };

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed]);

  const current = images[Math.min(active, Math.max(0, images.length - 1))];
  const goNext = useCallback(
    () => setActive((i) => (i + 1) % images.length),
    [images.length]
  );
  const goPrev = useCallback(
    () => setActive((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );

  if (images.length === 0) {
    return (
      <div className="border-border bg-muted text-muted-foreground flex aspect-[4/5] w-full items-center justify-center rounded-xl border">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
        {images.slice(0, 5).map((image, i) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            aria-current={i === active}
            className={
              "relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border-2 sm:w-20 " +
              (i === active ? "border-primary" : "hover:border-border border-transparent")
            }
          >
            <Image
              src={image.url}
              alt={image.alt ?? `Product image ${i + 1}`}
              fill
              sizes="80px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <div className="relative flex-1">
        <div
          className="group bg-muted relative aspect-[4/5] w-full overflow-hidden rounded-xl"
          role="img"
          aria-label={current.alt ?? "Product image"}
        >
          <Image
            src={current.url}
            alt={current.alt ?? "Product image"}
            fill
            sizes="(min-width: 768px) 45vw, 100vw"
            priority
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Zoom image"
            className="bg-background/90 text-foreground hover:bg-background absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full shadow transition"
          >
            <ZoomIn className="size-4" aria-hidden="true" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="bg-background/80 text-foreground absolute top-1/2 left-2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full shadow sm:flex"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="bg-background/80 text-foreground absolute top-1/2 right-2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full shadow sm:flex"
              >
                ›
              </button>
            </>
          )}
        </div>

        {zoomed && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={() => setZoomed(false)}
          >
            <button
              type="button"
              aria-label="Close zoom"
              className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <Minimize2 className="size-5" aria-hidden="true" />
            </button>
            <div
              className="relative max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={current.url}
                alt={current.alt ?? "Product image (zoomed)"}
                width={1200}
                height={1500}
                className="max-h-[90vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
