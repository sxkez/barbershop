import { Check } from "lucide-react";
import { cn } from "@/lib/format";

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-start" aria-label="Fortschritt">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center text-center" aria-current={state === "current" ? "step" : undefined}>
            {i > 0 && (
              <span aria-hidden className={cn("absolute right-1/2 top-[18px] h-[2px] w-full -translate-y-1/2", i <= current ? "bg-blue" : "bg-line-strong")} />
            )}
            <span
              className={cn(
                "relative z-10 grid size-9 place-items-center rounded-full border-2 text-sm font-bold",
                state === "done" && "border-blue bg-blue text-white",
                state === "current" && "border-blue bg-ink text-fg shadow-[0_0_0_4px_rgba(8,123,255,0.25)]",
                state === "todo" && "border-line-strong bg-ink text-muted",
              )}
            >
              {state === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={cn("mt-2 text-[0.7rem] font-semibold sm:text-xs", state === "todo" ? "text-muted" : "text-fg")}>
              {label}
              <span className="sr-only">{state === "done" ? " (erledigt)" : state === "current" ? " (aktuell)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
