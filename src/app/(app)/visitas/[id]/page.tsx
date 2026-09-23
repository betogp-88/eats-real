import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Stat } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { money, fecha, num } from "@/lib/utils";
import { eliminarVisita } from "../actions";

const RESULTADO: Record<string, string> = { venta: "Visita normal", sin_pedido: "Sin movimiento", cerrada: "Cerrada", no_encontrada: "No se encontró al encargado", ya_no_vende: "Ya no vende" };

export default async function VisitaPage({ params }: PageProps<"/visitas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: v } = await supabase.from("visitas").select("*, puntos_venta(id, nombre), rutas(id, nombre), pedidos(id, pago_estado, pago_metodo, pedido_lineas(cantidad, precio_unitario, productos(nombre)))").eq("id", id).maybeSingle();
  if (!v) notFound();
  const pv = v.puntos_venta as unknown as { id: string; nombre: string } | null;
  const ruta = v.rutas as unknown as { id: string; nombre: string } | null;
  const pedido = v.pedidos as unknown as { id: string; pago_estado: string; pago_metodo: string | null; pedido_lineas: { cantidad: number; precio_unitario: number; productos: { nombre: string } | null }[] } | null;
  const { data: usuario } = v.usuario_id ? await supabase.schema("public").from("perfiles").select("nombre, email").eq("id", v.usuario_id).maybeSingle() : { data: null };
  const fotos = v.fotos?.length ? (await supabase.storage.from("visitas").createSignedUrls(v.fotos, 3600)).data ?? [] : [];

  return (
    <>
      <PageHeader title={`Visita a ${pv?.nombre ?? "—"}`} subtitle={`${fecha(v.fecha)} · ${usuario?.nombre || usuario?.email?.split("@")[0] || "—"}${ruta ? " · ruta " + ruta.nombre : ""}`} back={ruta ? { href: `/rutas/${ruta.id}`, label: ruta.nombre } : { href: `/puntos-venta/${pv?.id}`, label: pv?.nombre ?? "Punto de venta" }}
        actions={<><Badge color={v.resultado === "venta" ? "green" : "gray"}>{RESULTADO[v.resultado]}</Badge>{!pedido && v.repuesto === 0 && <ConfirmButton action={async () => { "use server"; return eliminarVisita(id); }} confirmText="¿Eliminar esta visita?">Eliminar</ConfirmButton>}</>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Vendido" value={`${num(v.vendido)} bolsas`} hint={pedido ? money(pedido.pedido_lineas.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0)) : undefined} />
        <Stat label="Repuesto" value={`${num(v.repuesto)} bolsas`} />
        <Stat label="Cobrado" value={money(v.cobro_monto)} hint={v.cobro_metodo === "pendiente" ? "Quedó pendiente" : v.cobro_metodo ?? undefined} color={v.cobro_metodo === "pendiente" ? "red" : "brand"} />
        <Stat label="Pago del pedido" value={pedido ? (pedido.pago_estado === "pagado" ? "Pagado" : "Pendiente") : "—"} hint={pedido?.pago_metodo ?? undefined} color={pedido?.pago_estado === "pendiente" ? "red" : "ink"} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Detalle">
          {pedido ? (
            <table className="mb-3">
              <thead><tr><th>Producto</th><th className="text-right">Vendió</th><th className="text-right">Precio</th><th className="text-right">Importe</th></tr></thead>
              <tbody>{pedido.pedido_lineas.map((l, i) => <tr key={i}><td>{l.productos?.nombre}</td><td className="text-right">{l.cantidad}</td><td className="text-right">{money(l.precio_unitario)}</td><td className="text-right">{money(l.cantidad * Number(l.precio_unitario))}</td></tr>)}</tbody>
            </table>
          ) : <p className="text-sm text-ink-soft mb-3">No se registró venta en esta visita.</p>}
          {pedido && <p className="text-sm"><Link href={`/pedidos/${pedido.id}`} className="text-brand hover:underline">Ver pedido generado</Link></p>}
          {v.notas && <p className="text-sm mt-3 whitespace-pre-line"><span className="text-ink-soft">Notas:</span> {v.notas}</p>}
        </Card>
        <Card title={`Fotos (${fotos.length})`}>
          {!fotos.length ? <p className="text-sm text-ink-soft">Sin fotos.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {fotos.map((f, i) => f.signedUrl ? (
                <a key={i} href={f.signedUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.signedUrl} alt={`Foto ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-line" />
                </a>
              ) : null)}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
