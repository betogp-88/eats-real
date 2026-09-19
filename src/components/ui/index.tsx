import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand/90",
  secondary: "bg-white border border-line text-ink hover:bg-muted",
  accent: "bg-accent text-white hover:bg-accent/90",
  ghost: "text-ink-soft hover:bg-muted",
  danger: "bg-white border border-red-200 text-red-700 hover:bg-red-50",
};
const base = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}

export function Card({ className, children, title, actions, padded = true }: { className?: string; children: ReactNode; title?: ReactNode; actions?: ReactNode; padded?: boolean }) {
  return (
    <section className={cn("rounded-xl bg-card border border-line shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <h2 className="font-semibold text-ink">{title}</h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={cn("overflow-x-auto", padded && "p-4")}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 md:mb-6">
      <div className="min-w-0">
        {back && <Link href={back.href} className="text-xs text-ink-soft hover:text-brand">← {back.label}</Link>}
        <h1 className="text-xl md:text-2xl font-bold text-brand truncate">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  green: "bg-brand-light/20 text-brand",
  orange: "bg-accent-soft/50 text-orange-800",
  gray: "bg-muted text-ink-soft",
  red: "bg-red-100 text-red-700",
};
export type BadgeColor = keyof typeof badgeColors;
export function Badge({ color = "gray", children }: { color?: BadgeColor; children: ReactNode }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", badgeColors[color])}>{children}</span>;
}

export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <div className={className}>
      <label>{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

/** Input de pesos: muestra el signo $ y acepta centavos. */
export function MoneyInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">$</span>
      <input type="number" step="0.01" min="0" inputMode="decimal" className={cn("pl-7", className)} {...props} />
    </div>
  );
}

/** Input de porcentaje: muestra el signo %. */
export function PercentInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className="relative">
      <input type="number" step="0.1" min="0" max="100" inputMode="decimal" className={cn("pr-8", className)} {...props} />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">%</span>
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-sm text-ink-soft py-10 text-center">
      <p>{children}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: "brand" | "red" | "ink" }) {
  return (
    <div className="rounded-xl bg-card border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={cn("text-xl md:text-2xl font-bold mt-1", color === "red" ? "text-red-600" : color === "ink" ? "text-ink" : "text-brand")}>{value}</p>
      {hint && <p className="text-xs text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok"; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg px-3 py-2 text-sm", kind === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-brand-light/15 text-brand border border-brand-light/40")}>
      {children}
    </div>
  );
}

/** Pestañas por enlace (para sub-secciones y filtros). */
export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <div className="flex gap-1 border-b border-line mb-5 overflow-x-auto">
      {items.map((t) => (
        <Link key={t.key} href={t.href} className={cn("px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition", t.key === current ? "border-brand text-brand font-medium" : "border-transparent text-ink-soft hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/** Chips de filtro por enlace. */
export function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return <Link href={href} className={cn("rounded-full px-3 py-1 text-xs whitespace-nowrap", active ? "bg-brand text-white" : "bg-white border border-line text-ink-soft hover:bg-muted")}>{children}</Link>;
}

/** Panel desplegable para acciones secundarias. */
export function Panel({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group rounded-xl bg-card border border-line shadow-sm" open={open}>
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-ink flex items-center justify-between">
        {title}<span className="text-ink-soft text-xs group-open:rotate-180 transition">▼</span>
      </summary>
      <div className="p-4 border-t border-line">{children}</div>
    </details>
  );
}

export function WhatsApp({ telefono, children }: { telefono: string | null | undefined; children?: ReactNode }) {
  if (!telefono) return null;
  const digits = telefono.replace(/\D/g, "");
  const num = digits.length === 10 ? "52" + digits : digits;
  return <a href={`https://wa.me/${num}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline text-sm">{children ?? "WhatsApp"}</a>;
}
