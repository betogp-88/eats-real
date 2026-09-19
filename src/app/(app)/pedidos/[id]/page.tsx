import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Stat, Field, MoneyInput } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { money, fecha, pct, CANALES, ESTADOS_PEDIDO } from "@/lib/utils";
import { sugerirDespacho } from "@/lib/fifo";
import { actualizarCargos, cancelarPedido, eliminarPedido } from "../actions";
import { DespachoForm } from "./despacho";

export default async function PedidoPage({ params }: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*, ubicaciones(nombre), clientes(id, nombre, telefono), puntos_venta(id, nombre), pedido_lineas(id, producto_id, cantidad, precio_unitario, productos(nombre), despachos(cantidad, costo_unitario, lotes(codigo)))")
    .eq("id", id).maybeSingle();
  if (!pedido) notFound();

  type Linea = { id: string; producto_id: string; cantidad: number; precio_unitario: number; productos: { nombre: string } | null; despachos: { cantidad: number; costo_unitario: number; lotes: { codigo: string } | null }[] };
  const lineas = pedido.pedido_lineas as unknown as Linea[];
  const cliente = pedido.clientes as unknown as { id: string; nombre: string; telefono: string | null } | null;
  const pv = pedido.puntos_venta as unknown as { id: string; nombre: string } | null;
  const subtotal = lineas.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0);
  const total = subtotal - Number(pedido.descuento) + Number(pedido.envio_cobrado);
  const costo = lineas.reduce((s, l) => s + l.despachos.reduce((t, d) => t + d.cantidad * Number(d.costo_unitario), 0), 0);
  const margen = total - costo - Number(pedido.comision_plataforma) - Number(pedido.costo_envio);
  const lineasDespacho = pedido.estado === "pendiente" ? await sugerirDespacho(supabase, lineas, pedido.ubicacion_id) : [];
  const quien = pv ? <Link href={`/puntos-venta/${pv.id}`} className="text-brand hover:underline">{pv.nombre}</Link> : cliente ? <Link href={`/clientes/${cliente.id}`} className="text-brand hover:underline">{cliente.nombre}</Link> : pedido.cliente_nombre;

  return (
    <>
      <PageHeader title={`Pedido ${pedido.ref_externa ?? fecha(pedido.fecha)}`} subtitle={`${CANALES[pedido.canal]} · ${fecha(pedido.fecha)}`} back={{ href: "/pedidos", label: "Pedidos" }}
        actions={<>
          <Badge color={pedido.estado === "despachado" ? "green" : pedido.estado === "cancelado" ? "red" : "orange"}>{ESTADOS_PEDIDO[pedido.estado]}</Badge>
          {pedido.estado === "pendiente" && <ConfirmButton action={async () => { "use server"; return eliminarPedido(id); }} confirmText="¿Eliminar este pedido pendiente?" variant="ghost">Eliminar</ConfirmButton>}
          {pedido.estado !== "cancelado" && <ConfirmButton action={async () => { "use server"; return cancelarPedido(id); }} confirmText={pedido.estado === "despachado" ? "¿Cancelar? El inventario regresa a la ubicación de origen." : "¿Cancelar este pedido?"}>Cancelar pedido</ConfirmButton>}
        </>} />
      <p className="text-sm mb-4 -mt-3">Para: <strong>{quien ?? "—"}</strong>{(pedido.ubicaciones as unknown as { nombre: string } | null)?.nombre && <span className="text-ink-soft"> · sale de {(pedido.ubicaciones as unknown as { nombre: string }).nombre}</span>}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total cobrado" value={money(total)} hint={`Subtotal ${money(subtotal)} − desc. ${money(pedido.descuento)} + envío ${money(pedido.envio_cobrado)}`} />
        <Stat label="Costo de venta" value={pedido.estado === "despachado" ? money(costo) : "—"} hint={pedido.estado === "despachado" ? "Según lotes despachados" : "Se define al despachar"} />
        <Stat label="Comisión + envío" value={money(Number(pedido.comision_plataforma) + Number(pedido.costo_envio))} />
        <Stat label="Margen del pedido" value={pedido.estado === "despachado" ? money(margen) : "—"} hint={pedido.estado === "despachado" ? pct(margen, total) : undefined} color={margen < 0 ? "red" : "brand"} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card title="Productos" padded={false}>
            <table>
              <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Importe</th>{pedido.estado === "despachado" && <th>Lotes</th>}</tr></thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.id}>
                    <td>{l.productos?.nombre}</td><td className="text-right">{l.cantidad}</td><td className="text-right">{money(l.precio_unitario)}</td><td className="text-right">{money(l.cantidad * Number(l.precio_unitario))}</td>
                    {pedido.estado === "despachado" && <td className="text-xs">{l.despachos.map((d, i) => <span key={i} className="inline-block mr-2 font-mono">{d.lotes?.codigo} ×{d.cantidad} @ {money(d.costo_unitario)}</span>)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Cargos y notas">
            <ActionForm action={actualizarCargos.bind(null, id)} submit="Guardar cargos" variant="secondary">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Descuento"><MoneyInput name="descuento" defaultValue={pedido.descuento} /></Field>
                <Field label="Envío cobrado"><MoneyInput name="envio_cobrado" defaultValue={pedido.envio_cobrado} /></Field>
                <Field label="Comisión de plataforma"><MoneyInput name="comision_plataforma" defaultValue={pedido.comision_plataforma} /></Field>
                <Field label="Costo real del envío"><MoneyInput name="costo_envio" defaultValue={pedido.costo_envio} /></Field>
                <Field label="Notas" className="sm:col-span-2"><input name="notas" defaultValue={pedido.notas ?? ""} /></Field>
              </div>
            </ActionForm>
          </Card>
        </div>
        {pedido.estado === "pendiente" && (
          <Card title="Despachar: asignar lotes">
            <p className="text-sm text-ink-soft mb-4">Se sugiere el lote más próximo a caducar. Cambia las cantidades si quieres usar otro lote.</p>
            <DespachoForm pedidoId={id} lineas={lineasDespacho} />
          </Card>
        )}
      </div>
    </>
  );
}
