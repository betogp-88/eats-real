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
  const { data: rutas } = await supabase.from("rutas").select("id, nombre").eq("activo", true).order("nombre");
  if (id === "nuevo") {
    return (<><PageHeader title="Nuevo punto de venta" back={{ href: "/puntos-venta", label: "Puntos de venta" }} /><Card className="max-w-2xl"><PuntoVentaForm rutas={rutas ?? []} /></Card></>);
  }
  const [{ data: pv }, { data: r }, { data: pedidos }, { data: visitas }] = await Promise.all([
    supabase.from("puntos_venta").select("*, rutas(id, nombre)").eq("id", id).maybeSingle(),
    supabase.from("puntos_venta_resumen").select("*").eq("punto_venta_id", id).maybeSingle(),
    supabase.from("pedidos").select("id, fecha, ref_externa, estado, pago_estado, descuento, envio_cobrado, pedido_lineas(cantidad, precio_unitario)").eq("punto_venta_id", id).order("fecha", { ascending: false }).limit(50),
    supabase.from("visitas").select("id, fecha, resultado, vendido, repuesto, cobro_monto, cobro_metodo").eq("punto_venta_id", id).order("fecha", { ascending: false }).limit(30),
  ]);
  if (!pv) notFound();
  const { data: existencias } = pv.ubicacion_id
    ? await supabase.from("existencias").select("cantidad, productos(nombre), lotes(codigo, fecha_caducidad)").eq("ubicacion_id", pv.ubicacion_id)
    : { data: [] };

  return (
    <>
      <PageHeader title={pv.nombre} subtitle={[(pv.rutas as unknown as { nombre: string } | null)?.nombre ? `Ruta ${(pv.rutas as unknown as { nombre: string }).nombre}` : null, pv.contacto, pv.telefono, pv.direccion].filter(Boolean).join(" · ")} back={{ href: "/puntos-venta", label: "Puntos de venta" }}
        actions={<>
          <Badge color={pv.modalidad === "consignacion" ? "orange" : "green"}>{MODALIDADES[pv.modalidad]}</Badge>
          <WhatsApp telefono={pv.telefono}><span className="rounded-lg bg-brand-light/20 px-3 py-1.5">WhatsApp</span></WhatsApp>
          {pv.modalidad === "consignacion" && <LinkButton href={`/inventario?traslado=${pv.ubicacion_id}`} variant="secondary">Enviar producto</LinkButton>}
          <LinkButton href={`/visitas/nueva?pv=${pv.id}${pv.ruta_id ? `&ruta=${pv.ruta_id}` : ""}`} variant="accent">Visitar</LinkButton>
        </>} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat label="Último pedido" value={r?.ultimo_pedido ? diasTexto(r.dias_sin_pedir) : "Nunca"} hint={fecha(r?.ultimo_pedido)} />
        <Stat label="Frecuencia" value={r?.dias_entre_pedidos != null ? `Cada ${r.dias_entre_pedidos} días` : "—"} hint={`${r?.pedidos ?? 0} pedidos`} color="ink" />
        <Stat label="Total vendido" value={money(r?.total_vendido)} />
        {pv.modalidad === "consignacion" ? <Stat label="Inventario en tienda" value={num(r?.inventario ?? 0)} hint="bolsas a consignación" /> : <Stat label="Última visita" value={r?.ultima_visita ? fecha(r.ultima_visita) : "—"} color="ink" />}
        <Stat label="Saldo por cobrar" value={money(r?.saldo_pendiente)} color={Number(r?.saldo_pendiente) > 0 ? "red" : "brand"} hint="pedidos pendientes de pago" />
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
          <Card title="Visitas" padded={false}>
            {!visitas?.length ? <Empty>Sin visitas todavía.</Empty> : (
              <table>
                <thead><tr><th>Fecha</th><th>Resultado</th><th className="text-right">Vendió</th><th className="text-right">Repuso</th><th className="text-right">Cobró</th></tr></thead>
                <tbody>{visitas.map((v) => (
                  <tr key={v.id}><td><Link href={`/visitas/${v.id}`} className="text-brand hover:underline">{fecha(v.fecha)}</Link></td><td>{v.resultado === "venta" ? "Normal" : v.resultado.replace("_", " ")}</td><td className="text-right">{v.vendido}</td><td className="text-right">{v.repuesto}</td><td className="text-right">{money(v.cobro_monto)}{v.cobro_metodo === "pendiente" && <> <Badge color="red">Pendiente</Badge></>}</td></tr>
                ))}</tbody>
              </table>
            )}
          </Card>
          <Card title="Pedidos">
            {!pedidos?.length ? <Empty>Sin pedidos todavía.</Empty> : (
              <table>
                <thead><tr><th>Fecha</th><th className="text-right">Bolsas</th><th className="text-right">Total</th><th>Pago</th><th>Estado</th></tr></thead>
                <tbody>{pedidos.map((p) => {
                  const ls = p.pedido_lineas as unknown as { cantidad: number; precio_unitario: number }[];
                  const total = ls.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0) - Number(p.descuento) + Number(p.envio_cobrado);
                  return (<tr key={p.id}><td><Link href={`/pedidos/${p.id}`} className="text-brand hover:underline">{fecha(p.fecha)}</Link></td><td className="text-right">{ls.reduce((s, l) => s + l.cantidad, 0)}</td><td className="text-right">{money(total)}</td><td>{p.estado !== "cancelado" && <Badge color={p.pago_estado === "pagado" ? "green" : "red"}>{p.pago_estado === "pagado" ? "Pagado" : "Por cobrar"}</Badge>}</td><td><Badge color={p.estado === "despachado" ? "green" : p.estado === "cancelado" ? "red" : "orange"}>{ESTADOS_PEDIDO[p.estado]}</Badge></td></tr>);
                })}</tbody>
              </table>
            )}
          </Card>
        </div>
        <Card title="Datos generales" actions={<ConfirmButton action={async () => { "use server"; return toggleActivoPuntoVenta(id, !pv.activo); }} confirmText={pv.activo ? "¿Desactivar este punto de venta?" : "¿Activar este punto de venta?"} variant="secondary">{pv.activo ? "Desactivar" : "Activar"}</ConfirmButton>}>
          <PuntoVentaForm pv={pv} rutas={rutas ?? []} />
        </Card>
      </div>
    </>
  );
}
