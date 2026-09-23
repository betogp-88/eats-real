import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { PedidoForm } from "./form";

export default async function NuevoPedidoPage({ searchParams }: PageProps<"/pedidos/nuevo">) {
  const sp = await searchParams;
  const clienteId = typeof sp.cliente === "string" ? sp.cliente : null;
  const pvId = typeof sp.punto_venta === "string" ? sp.punto_venta : undefined;
  const supabase = await createClient();
  const [{ data: productos }, { data: puntosVenta }, { data: cliente }] = await Promise.all([
    supabase.from("productos").select("id, nombre, precio_lista").eq("activo", true).order("nombre"),
    supabase.from("puntos_venta").select("id, nombre, modalidad, rutas(nombre)").eq("activo", true).order("nombre").limit(1000),
    clienteId ? supabase.from("clientes").select("id, nombre, telefono").eq("id", clienteId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <PageHeader title="Nuevo pedido" back={{ href: "/pedidos", label: "Pedidos" }} />
      <Card className="max-w-4xl"><PedidoForm productos={productos ?? []} puntosVenta={(puntosVenta ?? []).map((p) => ({ id: p.id, nombre: p.nombre, modalidad: p.modalidad, ruta: (p.rutas as unknown as { nombre: string } | null)?.nombre ?? null }))} clienteInicial={cliente} puntoVentaInicial={pvId} /></Card>
    </>
  );
}
