import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Button, Stat } from "@/components/ui";
import { money, fecha, CANALES, ESTADOS_PEDIDO } from "@/lib/utils";
import { actualizarCargos } from "../actions";
import { DespachoForm, type LineaDespacho } from "./despacho";
import { BotonCancelar, BotonEliminar } from "./acciones";

export default async function PedidoPage({ params }: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*, ubicaciones(nombre), pedido_lineas(id, producto_id, cantidad, precio_unitario, productos(nombre), despachos(cantidad, costo_unitario, lotes(codigo)))")
    .eq("id", id)
    .maybeSingle();
  if (!pedido) notFound();

  type Linea = { id: string; producto_id: string; cantidad: number; precio_unitario: number; productos: { nombre: string } | null; despachos: { cantidad: number; costo_unitario: number; lotes: { codigo: string } | null }[] };
  const lineas = pedido.pedido_lineas as unknown as Linea[];
  const subtotal = lineas.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0);
  const total = subtotal - Number(pedido.descuento) + Number(pedido.envio_cobrado);
  const costo = lineas.reduce((s, l) => s + l.despachos.reduce((t, d) => t + d.cantidad * Number(d.costo_unitario), 0), 0);
  const margen = total - costo - Number(pedido.comision_plataforma) - Number(pedido.costo_envio);

  // Lotes disponibles en la ubicación del pedido, FIFO por caducidad/fecha de producción
  let lineasDespacho: LineaDespacho[] = [];
  if (pedido.estado === "pendiente") {
    let ubicId = pedido.ubicacion_id as string | null;
    if (!ubicId) {
      const { data: alm } = await supabase.from("ubicaciones").select("id").eq("tipo", "almacen").eq("activo", true).order("nombre").limit(1).maybeSingle();
      ubicId = alm?.id ?? null;
    }
    const { data: ex } = await supabase
      .from("existencias")
      .select("lote_id, producto_id, cantidad, lotes(codigo, fecha_caducidad, fecha_produccion, costo_unitario)")
      .eq("ubicacion_id", ubicId ?? "00000000-0000-0000-0000-000000000000")
      .gt("cantidad", 0);
    type Ex = { lote_id: string; producto_id: string; cantidad: number; lotes: { codigo: string; fecha_caducidad: string | null; fecha_produccion: string; costo_unitario: number } | null };
    const existencias = (ex ?? []) as unknown as Ex[];
    lineasDespacho = lineas.map((l) => {
      const lotes = existencias
        .filter((e) => e.producto_id === l.producto_id && e.lotes)
        .sort((a, b) => (a.lotes!.fecha_caducidad ?? "9999").localeCompare(b.lotes!.fecha_caducidad ?? "9999") || a.lotes!.fecha_produccion.localeCompare(b.lotes!.fecha_produccion))
        .map((e) => ({ id: e.lote_id, codigo: e.lotes!.codigo, fecha_caducidad: e.lotes!.fecha_caducidad, costo_unitario: Number(e.lotes!.costo_unitario), disponible: e.cantidad }));
      const sugerido: Record<string, number> = {};
      let falta = l.cantidad;
      for (const lo of lotes) { if (falta <= 0) break; const q = Math.min(falta, lo.disponible); sugerido[lo.id] = q; falta -= q; }
      return { id: l.id, producto: l.productos?.nombre ?? "", cantidad: l.cantidad, lotes, sugerido };
    });
  }

  return (
    <>
      <PageHeader
        title={`Pedido ${pedido.ref_externa ?? pedido.id.slice(0, 8)}`}
        subtitle={`${CANALES[pedido.canal]} · ${fecha(pedido.fecha)}${pedido.cliente_nombre ? " · " + pedido.cliente_nombre : ""}${(pedido.ubicaciones as unknown as { nombre: string } | null)?.nombre ? " · desde " + (pedido.ubicaciones as unknown as { nombre: string }).nombre : ""}`}
        actions={
          <>
            <Badge color={pedido.estado === "despachado" ? "green" : pedido.estado === "cancelado" ? "red" : "orange"}>{ESTADOS_PEDIDO[pedido.estado]}</Badge>
            {pedido.estado === "pendiente" && <BotonEliminar id={pedido.id} />}
            {pedido.estado !== "cancelado" && <BotonCancelar id={pedido.id} />}
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total cobrado" value={money(total)} hint={`Subtotal ${money(subtotal)} − desc. ${money(pedido.descuento)} + envío ${money(pedido.envio_cobrado)}`} />
        <Stat label="Costo de venta" value={pedido.estado === "despachado" ? money(costo) : "—"} hint={pedido.estado === "despachado" ? "Según lotes despachados" : "Se define al despachar"} />
        <Stat label="Comisión + envío" value={money(Number(pedido.comision_plataforma) + Number(pedido.costo_envio))} />
        <Stat label="Margen del pedido" value={pedido.estado === "despachado" ? money(margen) : "—"} hint={pedido.estado === "despachado" && total > 0 ? `${((margen / total) * 100).toFixed(0)}%` : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card title="Productos">
            <table>
              <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Importe</th>{pedido.estado === "despachado" && <th>Lotes</th>}</tr></thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.id}>
                    <td>{l.productos?.nombre}</td>
                    <td className="text-right">{l.cantidad}</td>
                    <td className="text-right">{money(l.precio_unitario)}</td>
                    <td className="text-right">{money(l.cantidad * Number(l.precio_unitario))}</td>
                    {pedido.estado === "despachado" && <td className="text-xs">{l.despachos.map((d, i) => <span key={i} className="inline-block mr-2 font-mono">{d.lotes?.codigo} ×{d.cantidad} @ {money(d.costo_unitario)}</span>)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Cargos y notas">
            <form action={actualizarCargos.bind(null, pedido.id)} className="grid sm:grid-cols-2 gap-3">
              <div><label>Descuento</label><input name="descuento" type="number" step="0.01" min="0" defaultValue={pedido.descuento} /></div>
              <div><label>Envío cobrado</label><input name="envio_cobrado" type="number" step="0.01" min="0" defaultValue={pedido.envio_cobrado} /></div>
              <div><label>Comisión de plataforma</label><input name="comision_plataforma" type="number" step="0.01" min="0" defaultValue={pedido.comision_plataforma} /></div>
              <div><label>Costo real del envío</label><input name="costo_envio" type="number" step="0.01" min="0" defaultValue={pedido.costo_envio} /></div>
              <div className="sm:col-span-2"><label>Notas</label><input name="notas" defaultValue={pedido.notas ?? ""} /></div>
              <div className="sm:col-span-2"><Button type="submit" variant="secondary">Guardar</Button></div>
            </form>
          </Card>
        </div>
        {pedido.estado === "pendiente" && (
          <Card title="Despacho: asignar lotes">
            <p className="text-sm text-ink-soft mb-4">Se sugiere el lote más próximo a caducar (FIFO). Puedes cambiar la asignación antes de confirmar.</p>
            <DespachoForm pedidoId={pedido.id} lineas={lineasDespacho} />
          </Card>
        )}
      </div>
    </>
  );
}
