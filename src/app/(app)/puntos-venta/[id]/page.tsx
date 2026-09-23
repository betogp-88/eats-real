import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Stat, Empty, WhatsApp, LinkButton } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { money, fecha, diasTexto, MODALIDADES, ESTADOS_PEDIDO, num } from "@/lib/utils";
import { PuntoVentaForm } from "../form";
import { toggleActivoPuntoVenta } from "../actions";

export default async function PuntoVentaPage({ params }: PageProps<"/puntos-venta/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: zonasRaw } = await supabase.from("puntos_venta").select("zona").not("zona", "is", null);
  const zonas = [...new Set((zonasRaw ?? []).map((z) => z.zona as string))].sort();
  if (id === "nuevo") {
    return (<><PageHeader title="Nuevo punto de venta" back={{ href: "/puntos-venta", label: "Puntos de venta" }} /><Card className="max-w-2xl"><PuntoVentaForm zonas={zonas} /></Card></>);
  }
  const [{ data: pv }, { data: r }, { data: pedidos }] = await Promise.all([
    supabase.from("puntos_venta").select("*").eq("id", id).maybeSingle(),
    supabase.from("puntos_venta_resumen").select("*").eq("punto_venta_id", id).maybeSingle(),
    supabase.from("pedidos").select("id, fecha, ref_externa, estado, descuento, envio_cobrado, pedido_lineas(cantidad, precio_unitario)").eq("punto_venta_id", id).order("fecha", { ascending: false }).limit(50),
  ]);
  if (!pv) notFound();
  const { data: existencias } = pv.ubicacion_id
    ? await supabase.from("existencias").select("cantidad, productos(nombre), lotes(codigo, fecha_caducidad)").eq("ubicacion_id", pv.ubicacion_id)
    : { data: [] };

  return (
    <>
      <PageHeader title={pv.nombre} subtitle={[pv.zona, pv.contacto, pv.telefono, pv.direccion].filter(Boolean).join(" · ")} back={{ href: "/puntos-venta", label: "Puntos de venta" }}
        actions={<>
          <Badge color={pv.modalidad === "consignacion" ? "orange" : "green"}>{MODALIDADES[pv.modalidad]}</Badge>
          <WhatsApp telefono={pv.telefono}><span className="rounded-lg bg-brand-light/20 px-3 py-1.5">WhatsApp</span></WhatsApp>
          {pv.modalidad === "consignacion" && <LinkButton href={`/inventario?traslado=${pv.ubicacion_id}`} variant="secondary">Enviar producto</LinkButton>}
          <LinkButton href={`/pedidos/nuevo?punto_venta=${pv.id}`} variant="accent">{pv.modalidad === "consignacion" ? "Registrar lo vendido" : "Nuevo pedido"}</LinkButton>
        </>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Último pedido" value={r?.ultimo_pedido ? diasTexto(r.dias_sin_pedir) : "Nunca"} hint={fecha(r?.ultimo_pedido)} />
        <Stat label="Frecuencia" value={r?.dias_entre_pedidos != null ? `Cada ${r.dias_entre_pedidos} días` : "—"} hint={`${r?.pedidos ?? 0} pedidos`} color="ink" />
        <Stat label="Total vendido" value={money(r?.total_vendido)} />
        {pv.modalidad === "consignacion" && <Stat label="Inventario en tienda" value={num(r?.inventario ?? 0)} hint="bolsas a consignación" />}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {pv.modalidad === "consignacion" && (
            <Card title="Producto que tiene en tienda">
              {!existencias?.length ? <Empty>No tiene producto ahora. Usa «Enviar producto» para trasladar desde el almacén.</Empty> : (
                <table>
                  <thead><tr><th>Producto</th><th>Lote</th><th>Caducidad</th><th className="text-right">Bolsas</th></tr></thead>
                  <tbody>{existencias.map((e, i) => (
                    <tr key={i}><td>{(e.productos as unknown as { nombre: string } | null)?.nombre}</td><td className="font-mono text-xs">{(e.lotes as unknown as { codigo: string } | null)?.codigo}</td><td>{fecha((e.lotes as unknown as { fecha_caducidad: string | null } | null)?.fecha_caducidad) || "—"}</td><td className="text-right">{e.cantidad}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </Card>
          )}
          <Card title="Pedidos">
            {!pedidos?.length ? <Empty>Sin pedidos todavía.</Empty> : (
              <table>
                <thead><tr><th>Fecha</th><th>Ref.</th><th className="text-right">Bolsas</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
                <tbody>{pedidos.map((p) => {
                  const ls = p.pedido_lineas as unknown as { cantidad: number; precio_unitario: number }[];
                  const total = ls.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0) - Number(p.descuento) + Number(p.envio_cobrado);
                  return (<tr key={p.id}><td><Link href={`/pedidos/${p.id}`} className="text-brand hover:underline">{fecha(p.fecha)}</Link></td><td>{p.ref_externa ?? "—"}</td><td className="text-right">{ls.reduce((s, l) => s + l.cantidad, 0)}</td><td className="text-right">{money(total)}</td><td><Badge color={p.estado === "despachado" ? "green" : p.estado === "cancelado" ? "red" : "orange"}>{ESTADOS_PEDIDO[p.estado]}</Badge></td></tr>);
                })}</tbody>
              </table>
            )}
          </Card>
        </div>
        <Card title="Datos generales" actions={<ConfirmButton action={async () => { "use server"; return toggleActivoPuntoVenta(id, !pv.activo); }} confirmText={pv.activo ? "¿Desactivar este punto de venta?" : "¿Activar este punto de venta?"} variant="secondary">{pv.activo ? "Desactivar" : "Activar"}</ConfirmButton>}>
          <PuntoVentaForm pv={pv} zonas={zonas} />
        </Card>
      </div>
    </>
  );
}
