import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/format";

/** Visual digital stamp card in HANI branding (gold on midnight blue, like the printed card). */
export function DigitalCard({
  stamps,
  required,
  name,
  cardCode,
  preview = false,
}: {
  stamps: number;
  required: number;
  name: string;
  cardCode?: string;
  preview?: boolean;
}) {
  const filled = Math.min(stamps, required);
  const eligible = stamps >= required;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gold/40 bg-[linear-gradient(135deg,#141b33,#0b1020_60%,#141b33)] p-5 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.95)] sm:p-6"
      aria-label={preview ? "Beispiel einer digitalen Stempelkarte" : `Digitale Stempelkarte: ${stamps} von ${required} Stempeln`}
      role="img"
    >
      <div aria-hidden className="pointer-events-none absolute inset-2 rounded-xl border border-gold/20" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl italic leading-none text-gold" style={{ fontFamily: "Georgia, serif" }}>
            Hani
          </p>
          <p className="mt-1 text-[0.6rem] font-semibold tracking-[0.3em] text-gold/80">BARBERSHOP</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tracking-wide text-gold">STEMPELKARTE</p>
          <p className="text-[0.65rem] tracking-[0.2em] text-fg/70">{preview ? "DIGITAL" : name}</p>
        </div>
      </div>
      <ol className="relative mt-5 grid grid-cols-5 gap-2" aria-hidden>
        {Array.from({ length: required }, (_, i) => (
          <li
            key={i}
            className={cn(
              "grid aspect-square place-items-center rounded-md border",
              i < filled ? "border-gold bg-gold/90 text-[#0b1020]" : "border-gold/40 bg-white/90",
            )}
          >
            {i < filled && <Check className="size-4 sm:size-5" strokeWidth={3} />}
          </li>
        ))}
      </ol>
      <div className="relative mt-4 flex items-center justify-between text-xs">
        <span className="font-semibold text-fg/85">
          {stamps} / {required} Stempel
        </span>
        {eligible ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 font-bold text-[#0b1020]">
            <Gift className="size-3.5" /> Belohnung bereit
          </span>
        ) : (
          <span className="text-fg/60">noch {required - stamps}</span>
        )}
      </div>
      {cardCode && <p className="relative mt-3 font-mono text-[0.7rem] tracking-widest text-fg/50">{cardCode}</p>}
    </div>
  );
}
