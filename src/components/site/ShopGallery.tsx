"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/format";

export type GalleryImage = { src: string; alt: string; title: string; caption: string };

const AUTO_MS = 4800;

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

const pad = (n: number) => String(n + 1).padStart(2, "0");

export function ShopGallery({ images }: { images: GalleryImage[] }) {
  const reduce = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  // Only auto-advance while visible, not hovered/focused and not reduced motion.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || paused || !inView || open !== null) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % images.length), AUTO_MS);
    return () => window.clearInterval(t);
  }, [reduce, paused, inView, open, images.length]);

  // Cursor-follow spotlight + parallax, written to CSS variables (no re-render).
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    e.currentTarget.style.setProperty("--px", x.toFixed(3));
    e.currentTarget.style.setProperty("--py", y.toFixed(3));
  };
  const onLeave = (e: ReactPointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--px", "0");
    e.currentTarget.style.setProperty("--py", "0");
  };

  const onRailScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const step = card.offsetWidth + 12;
    setMobileIndex(Math.max(0, Math.min(images.length - 1, Math.round(el.scrollLeft / step))));
  };

  return (
    <div ref={rootRef}>
      {/* ---------- Desktop: expanding panels ---------- */}
      <div
        className="hidden h-[min(72vh,620px)] gap-3 lg:flex"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setPaused(false)}
        role="list"
        aria-label="Bilder aus dem Salon"
      >
        {images.map((img, i) => {
          const isActive = i === active;
          return (
            <button
              key={img.src}
              type="button"
              role="listitem"
              aria-label={`${img.title}: ${img.alt}. Vergrößern`}
              aria-current={isActive ? "true" : undefined}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setOpen(i)}
              onPointerMove={onMove}
              onPointerLeave={onLeave}
              style={{ "--px": 0, "--py": 0 } as CSSProperties}
              className={cn(
                "group relative min-w-0 overflow-hidden rounded-3xl border text-left outline-none",
                "transition-[flex-grow,border-color,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "focus-visible:ring-2 focus-visible:ring-blue-soft focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                isActive
                  ? "grow-[6] border-blue/60 shadow-[0_30px_80px_-30px_rgba(8,123,255,0.65)]"
                  : "grow border-line hover:border-line-strong",
              )}
            >
              <span
                className="absolute inset-[-6%] block transition-transform duration-700 ease-out will-change-transform"
                style={{
                  transform: isActive
                    ? "translate3d(calc(var(--px) * -18px), calc(var(--py) * -14px), 0) scale(1.06)"
                    : "scale(1.15)",
                }}
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 60vw, 1px"
                  className={cn(
                    "object-cover transition-[filter] duration-700",
                    isActive ? "saturate-[1.08]" : "brightness-[0.45] saturate-[0.6] group-hover:brightness-[0.65]",
                  )}
                />
              </span>

              {/* spotlight following the cursor */}
              <span
                aria-hidden
                className={cn("pointer-events-none absolute inset-0 transition-opacity duration-500", isActive ? "opacity-100" : "opacity-0")}
                style={{
                  background:
                    "radial-gradient(420px circle at calc((var(--px) + 1) * 50%) calc((var(--py) + 1) * 50%), rgba(120,180,255,0.22), transparent 60%)",
                }}
              />
              {/* bottom shade */}
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

              {/* collapsed label */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 rotate-180 whitespace-nowrap text-sm font-bold uppercase tracking-[0.3em] text-fg/85 transition-all duration-500 [writing-mode:vertical-rl]",
                  isActive ? "opacity-0" : "opacity-100",
                )}
              >
                {img.title}
              </span>
              <span
                aria-hidden
                className={cn("absolute left-1/2 top-5 -translate-x-1/2 font-mono text-xs text-fg/60 transition-opacity", isActive ? "opacity-0" : "opacity-100")}
              >
                {pad(i)}
              </span>

              {/* expanded caption */}
              <span
                className={cn(
                  // fixed width: text never re-wraps while the panel grows or shrinks (the panel clips it)
                  "absolute bottom-0 left-0 block w-[min(40rem,48vw)] p-8",
                  isActive
                    ? "translate-y-0 opacity-100 transition-all delay-300 duration-700"
                    : "translate-y-4 opacity-0 transition-all duration-150",
                )}
              >
                <span className="flex items-center gap-3 font-mono text-xs tracking-widest text-blue-soft">
                  {pad(i)} <span className="h-px w-10 bg-blue-soft/60" /> {pad(images.length - 1)}
                </span>
                <span className="display mt-3 block text-4xl xl:text-5xl">{img.title}</span>
                <span className="mt-2 block max-w-md text-fg/75">{img.caption}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-8 right-8 grid size-12 place-items-center rounded-full border border-fg/40 bg-black/30 backdrop-blur transition-all group-hover:border-blue group-hover:bg-blue",
                  isActive ? "scale-100 opacity-100 delay-300 duration-500" : "scale-75 opacity-0 duration-150",
                )}
              >
                <Expand className="size-5" />
              </span>

              {/* auto-advance progress */}
              {isActive && !reduce && (
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
                  <span
                    key={`${active}-${paused}-${inView}`}
                    className="block h-full bg-gradient-to-r from-blue to-red"
                    style={{ animation: paused || !inView ? "none" : `gallery-progress ${AUTO_MS}ms linear forwards`, width: paused ? "100%" : undefined }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------- Mobile / tablet: snap carousel ---------- */}
      <div className="lg:hidden">
        <div
          ref={railRef}
          onScroll={onRailScroll}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
          aria-label="Bilder aus dem Salon"
        >
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${img.title}: ${img.alt}. Vergrößern`}
              className={cn(
                "relative aspect-[4/5] w-[82%] shrink-0 snap-center overflow-hidden rounded-3xl border transition-[transform,border-color] duration-500 sm:aspect-[4/3] sm:w-[70%]",
                i === mobileIndex ? "scale-100 border-blue/60" : "scale-[0.94] border-line",
              )}
            >
              <Image src={img.src} alt="" fill sizes="(min-width:640px) 70vw, 82vw" className="object-cover" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-5 text-left">
                <span className="font-mono text-xs text-blue-soft">
                  {pad(i)} / {pad(images.length - 1)}
                </span>
                <span className="display mt-1 block text-2xl">{img.title}</span>
                <span className="mt-1 block text-sm text-fg/75">{img.caption}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2" aria-hidden>
          {images.map((img, i) => (
            <span key={img.src} className={cn("h-1.5 rounded-full transition-all duration-300", i === mobileIndex ? "w-8 bg-blue" : "w-1.5 bg-line-strong")} />
          ))}
        </div>
      </div>

      {open !== null && <Lightbox images={images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} reduce={reduce} />}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  reduce,
}: {
  images: GalleryImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  reduce: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const n = images.length;
  const go = useCallback(
    (d: 1 | -1) => {
      setDir(d);
      onIndex((index + d + n) % n);
    },
    [index, n, onIndex],
  );

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [go, onClose]);

  const img = images[index];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Bild ${index + 1} von ${n}: ${img.title}`}
      className="gallery-fade fixed inset-0 z-[60] flex flex-col bg-[#020409]/95 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="font-mono text-sm text-fg/70" aria-live="polite">
          {pad(index)} / {pad(n - 1)} · <span className="text-fg">{img.title}</span>
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className="btn btn-ghost size-11 p-0" aria-label="Schließen">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div
          key={img.src}
          className="relative h-full max-h-[78vh] w-full max-w-6xl"
          style={reduce ? undefined : { animation: `${dir === 1 ? "gallery-in-right" : "gallery-in-left"} 0.45s cubic-bezier(0.22,1,0.36,1) both` }}
        >
          <Image src={img.src} alt={img.alt} fill priority sizes="100vw" className="select-none object-contain" draggable={false} />
        </div>
        <button type="button" onClick={() => go(-1)} className="btn btn-ghost absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 p-0 sm:inline-flex" aria-label="Vorheriges Bild">
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <button type="button" onClick={() => go(1)} className="btn btn-ghost absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 p-0 sm:inline-flex" aria-label="Nächstes Bild">
          <ChevronRight className="size-6" aria-hidden />
        </button>
      </div>

      <div className="px-4 pb-4 pt-3 sm:px-6">
        <p className="mx-auto max-w-2xl text-center text-sm text-fg/75">{img.caption}</p>
        <div className="mt-4 flex justify-center gap-2">
          {images.map((t, i) => (
            <button
              key={t.src}
              type="button"
              onClick={() => {
                setDir(i > index ? 1 : -1);
                onIndex(i);
              }}
              aria-label={`Bild ${i + 1}: ${t.title}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative h-12 w-16 overflow-hidden rounded-lg border-2 transition-all sm:h-14 sm:w-20",
                i === index ? "border-blue opacity-100" : "border-transparent opacity-45 hover:opacity-80",
              )}
            >
              <Image src={t.src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
