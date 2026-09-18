import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat, Card, Empty, Badge } from "@/components/ui";
import { money, num, fecha, CANALES } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();
  const mes = new Date().toISOString().slice(0, 7) + "-01";

  const [{ data: resultados }, { data: pendientes }, { data: existencias }, { data: productos }] = await Promise.all([
    supabase.from("resultados_mensuales").select("*").eq("mes", mes).maybeSingle(),
    supabase.from("pedidos").select("id, canal, fecha, ref_externa, cliente_nombre").eq("estado", "pendiente").order("fecha").limit(10),
    supabase.from("existencias").select("producto_id, ubicacion_id, cantidad, ubicaciones(tipo)"),
    supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const r = resultados;
  const utilidadBruta = r ? Number(r.ventas_netas) - Number(r.costo_venta) : 0;
  const utilidadOp = r ? utilidadBruta - Number(r.comisiones) - Number(r.costo_envio) - Number(r.marketing) - Number(r.gastos) : 0;

  const stockAlmacen = new Map<string, number>();
  for (const e of existencias ?? []) {
    const tipo = (e.ubicaciones as unknown as { tipo: string } | null)?.tipo;
    if (tipo === "almacen") stockAlmacen.set(e.producto_id, (stockAlmacen.get(e.producto_id) ?? 0) + e.cantidad);
  }

  return (
    <>
      <PageHeader title="Inicio" subtitle="Resumen del mes en curso" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Ventas netas" value={money(r?.ventas_netas)} />
        <Stat label="Costo de venta" value={money(r?.costo_venta)} />
        <Stat label="Utilidad bruta" value={money(utilidadBruta)} hint={r && Number(r.ventas_netas) > 0 ? `${((utilidadBruta / Number(r.ventas_netas)) * 100).toFixed(0)}% margen` : undefined} />
        <Stat label="Utilidad operativa" value={money(utilidadOp)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Pedidos por despachar" actions={<Link href="/pedidos" className="text-sm text-brand hover:underline">Ver todos</Link>}>
          {!pendientes?.length ? (
            <Empty>No hay pedidos pendientes.</Empty>
          ) : (
            <table>
              <tbody>
                {pendientes.map((p) => (
                  <tr key={p.id}>
                    <td>{fecha(p.fecha)}</td>
                    <td><Badge color="green">{CANALES[p.canal]}</Badge></td>
                    <td>{p.ref_externa ?? "—"}</td>
                    <td>{p.cliente_nombre ?? ""}</td>
                    <td className="text-right"><Link href={`/pedidos/${p.id}`} className="text-brand hover:underline">Despachar</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Inventario en almacén" actions={<Link href="/inventario" className="text-sm text-brand hover:underline">Detalle</Link>}>
          <table>
            <tbody>
              {(productos ?? []).map((p) => {
                const q = stockAlmacen.get(p.id) ?? 0;
                return (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td className="text-right font-medium">{num(q)} <span className="text-ink-soft font-normal">bolsas</span></td>
                    <td className="text-right">{q === 0 ? <Badge color="red">Sin stock</Badge> : q < 50 ? <Badge color="orange">Bajo</Badge> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
