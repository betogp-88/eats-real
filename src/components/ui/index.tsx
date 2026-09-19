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
const base = "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}

export function Card({ className, children, title, actions }: { className?: string; children: ReactNode; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl bg-card border border-line shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <h2 className="font-semibold text-ink">{title}</h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className="p-4 overflow-x-auto">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 md:mb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-brand">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  green: "bg-brand-light/20 text-brand",
  orange: "bg-accent-soft/50 text-orange-800",
  gray: "bg-muted text-ink-soft",
  red: "bg-red-100 text-red-700",
};
export function Badge({ color = "gray", children }: { color?: keyof typeof badgeColors; children: ReactNode }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", badgeColors[color])}>{children}</span>;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-soft py-8 text-center">{children}</p>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-card border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-2xl font-bold text-brand mt-1">{value}</p>
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
