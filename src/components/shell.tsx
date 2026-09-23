"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Menu, X, LayoutDashboard, CheckSquare, Factory, Warehouse, ShoppingCart, Receipt, BarChart3, Users, Store, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/login/actions";
import { Toast } from "@/components/ui/client";

const grupos = [
  { titulo: "Operación", items: [
    { href: "/", label: "Inicio", icon: LayoutDashboard },
    { href: "/tareas", label: "Tareas", icon: CheckSquare },
    { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/puntos-venta", label: "Puntos de venta", icon: Store },
  ]},
  { titulo: "Producto", items: [
    { href: "/lotes", label: "Producción", icon: Factory, also: ["/maquiladores"] },
    { href: "/inventario", label: "Inventario", icon: Warehouse },
  ]},
  { titulo: "Finanzas", items: [
    { href: "/gastos", label: "Gastos y marketing", icon: Receipt, also: ["/marketing"] },
    { href: "/resultados", label: "Resultados", icon: BarChart3 },
  ]},
  { titulo: "Configuración", items: [
    { href: "/productos", label: "Productos y almacén", icon: Settings },
  ]},
];

export function Shell({ email, nombre, logo, children }: { email?: string; nombre: string; logo: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const activo = (href: string, also?: string[]) => href === "/" ? path === "/" : [href, ...(also ?? [])].some((h) => path.startsWith(h));

  return (
    <div className="flex-1 flex min-h-screen">
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-brand text-white flex items-center gap-3 px-4">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="p-1 -ml-1"><Menu size={24} /></button>
        {logo}
        <span className="font-bold">{nombre} Admin</span>
      </header>

      {open && <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}

      <aside className={cn(
        "fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-50 w-64 md:w-60 shrink-0 bg-brand text-white flex flex-col transition-transform md:transition-none overflow-y-auto",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}>
        <div className="flex items-center gap-3 px-5 py-5">
          {logo}
          <div className="flex-1">
            <p className="font-bold leading-tight">{nombre}</p>
            <p className="text-xs text-white/60">Admin</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="md:hidden p-1"><X size={22} /></button>
        </div>
        <nav className="px-3 space-y-4">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <p className="px-3 mb-1 text-[11px] uppercase tracking-wider text-white/40">{g.titulo}</p>
              <div className="space-y-0.5">
                {g.items.map(({ href, label, icon: Icon, ...rest }) => (
                  <Link key={href} href={href} onClick={() => setOpen(false)} className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 md:py-2 text-sm transition",
                    activo(href, (rest as { also?: string[] }).also) ? "bg-white/15 text-white font-medium" : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}>
                    <Icon size={18} />{label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto px-5 py-4 border-t border-white/10">
          <p className="text-xs text-white/60 truncate">{email}</p>
          <form action={logout}><button className="text-xs text-white/80 hover:text-white mt-1">Cerrar sesión</button></form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 pt-18 md:p-8">{children}</main>
      <Suspense><Toast /></Suspense>
    </div>
  );
}
