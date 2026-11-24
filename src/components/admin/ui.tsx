import { CircleCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/format";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm",
        error ? "border-red/50 bg-red/10" : "border-emerald-500/40 bg-emerald-500/10",
      )}
    >
      {error ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden />}
      {error ?? ok}
    </p>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const STATUS_STYLE = {
  confirmed: "bg-blue/15 text-blue-soft ring-blue/40",
  completed: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
  cancelled: "bg-white/5 text-muted ring-line-strong line-through",
  no_show: "bg-red/15 text-[#ff8a90] ring-red/40",
} as const;
export const STATUS_LABEL = { confirmed: "Bestätigt", completed: "Erledigt", cancelled: "Storniert", no_show: "Nicht erschienen" } as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

export function Field({ label, name, hint, children }: { label: string; name?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 accent-blue" />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
