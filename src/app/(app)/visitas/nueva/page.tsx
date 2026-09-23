import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { MODALIDADES } from "@/lib/utils";
import { VisitaForm, type ProductoVisita } from "./form";

export default async function NuevaVisitaPage({ searchParams }: PageProps<"/visitas/nueva">) {
  const sp = await searchParams;
  const pvId = typeof sp.pv === "string" ? sp.pv : "";
  const rutaId = typeof sp.ruta === "string" ? sp.ruta : undefined;
  const supabase = await createClient();
  const [{ data: pv }, { data: productos }, { data: almacen }] = await Promise.all([
    supabase.from("puntos_venta").select("id, nombre, modalidad, ubicacion_id, contacto, telefono, puntos_venta_resumen(saldo_pendiente, ultima_visita)").eq("id", pvId).maybeSingle(),
    supabase.from("productos").select("id, nombre, precio_lista").eq("activo", true).order("nombre"),
    supabase.from("ubicaciones").select("id").eq("tipo", "almacen").eq("activo", true).order("nombre").limit(1).maybeSingle(),
  ]);
  if (!pv) notFound();
  const { data: ex } = await supabase.from("existencias").select("producto_id, ubicacion_id, cantidad").in("ubicacion_id", [pv.ubicacion_id, almacen?.id].filter(Boolean) as string[]);
  const stock = new Map<string, number>(); const alm = new Map<string, number>();
  for (const e of ex ?? []) {
    if (e.ubicacion_id === pv.ubicacion_id) stock.set(e.producto_id, (stock.get(e.producto_id) ?? 0) + e.cantidad);
    if (e.ubicacion_id === almacen?.id) alm.set(e.producto_id, (alm.get(e.producto_id) ?? 0) + e.cantidad);
  }
  const lista: ProductoVisita[] = (productos ?? []).map((p) => ({ id: p.id, nombre: p.nombre, precio_lista: Number(p.precio_lista), stock: stock.get(p.id) ?? 0, almacen: alm.get(p.id) ?? 0 }));
  const r = pv.puntos_venta_resumen as unknown as { saldo_pendiente: number; ultima_visita: string | null } | null;

  return (
    <>
      <PageHeader title={`Visita a ${pv.nombre}`} subtitle={`${MODALIDADES[pv.modalidad]}${pv.contacto ? " · " + pv.contacto : ""}${pv.telefono ? " · " + pv.telefono : ""}`} back={rutaId ? { href: `/rutas/${rutaId}`, label: "Ruta" } : { href: `/puntos-venta/${pv.id}`, label: pv.nombre }} />
      <Card className="max-w-4xl"><VisitaForm pv={{ id: pv.id, nombre: pv.nombre, modalidad: pv.modalidad, saldo: Number(r?.saldo_pendiente ?? 0) }} rutaId={rutaId} productos={lista} /></Card>
    </>
  );
}
