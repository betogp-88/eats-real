"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Factory, Warehouse, ShoppingCart, Megaphone, Receipt, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function Nav() {
  const path = usePathname();
  return (
    <nav className="px-3 space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-white/15 text-white font-medium" : "text-white/75 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
