"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, LayoutDashboard, Package, Factory, Warehouse, ShoppingCart, Megaphone, Receipt, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/login/actions";

const items = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/lotes", label: "Producción", icon: Factory },
  { href: "/inventario", label: "Inventario", icon: Warehouse },
  { href: "/pedidos", label: "Ventas y despacho", icon: ShoppingCart },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/resultados", label: "Resultados", icon: BarChart3 },
];

export function Shell({ email, children }: { email?: string; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="flex-1 flex min-h-screen">
      {/* Barra superior solo en móvil */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-brand text-white flex items-center gap-3 px-4">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="p-1 -ml-1"><Menu size={24} /></button>
        <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full bg-white/10 p-0.5" />
        <span className="font-bold">Eats Real Admin</span>
      </header>

      {open && <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 md:w-60 shrink-0 bg-brand text-white flex flex-col transition-transform md:transition-none",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}>
        <div className="flex items-center gap-3 px-5 py-5">
          <Image src="/logo.png" alt="" width={44} height={44} className="rounded-full bg-white/10 p-0.5" />
          <div className="flex-1">
            <p className="font-bold leading-tight">Eats Real</p>
            <p className="text-xs text-white/60">Admin</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="md:hidden p-1"><X size={22} /></button>
        </div>
        <nav className="px-3 space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 md:py-2 text-sm transition",
                active ? "bg-white/15 text-white font-medium" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}>
                <Icon size={18} />{label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-5 py-4 border-t border-white/10">
          <p className="text-xs text-white/60 truncate">{email}</p>
          <form action={logout}><button className="text-xs text-white/80 hover:text-white mt-1">Cerrar sesión</button></form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 pt-18 md:p-8">{children}</main>
    </div>
  );
}
