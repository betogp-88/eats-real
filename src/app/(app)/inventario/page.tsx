import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Empty, Badge, Panel, Stat } from "@/components/ui";
import { num, fecha } from "@/lib/utils";
import { TrasladoForm, AjusteForm } from "./forms";

function diasHasta(fecha: string | null) {
  return fecha ? Math.round((new Date(fecha).getTime() - Date.now()) / 86400000) : null;
}

const tipoMov: Record<string, string> = { entrada_lote: "Entrada de lote", salida_venta: "Venta", traslado: "Traslado", ajuste: "Ajuste", merma: "Merma" };

export default async function InventarioPage({ searchParams }: PageProps<"/inventario">) {
  const sp = await searchParams;
  const trasladoA = typeof sp.traslado === "string" ? sp.traslado : undefined;
  const supabase = await createClient();
  const [{ data: existencias }, { data: ubicaciones }, { data: productos }, { data: lotes }, { data: movimientos }] = await Promise.all([
    supabase.from("existencias").select("producto_id, lote_id, ubicacion_id, cantidad"),
    supabase.from("ubicaciones").select("id, nombre, tipo").eq("activo", true).order("tipo").order("nombre").limit(1000),
    supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("lotes").select("id, codigo, fecha_caducidad, productos(nombre)").neq("estado", "borrador").order("fecha_produccion"),
    supabase.from("movimientos_inv").select("id, fecha, tipo, cantidad, nota, productos(nombre), lotes(codigo), ubicaciones(nombre)").order("fecha", { ascending: false }).limit(40),
  ]);

  const ubics = ubicaciones ?? [];
  const almacen = ubics.find((u) => u.tipo === "almacen");
  const propias = ubics.filter((u) => u.tipo !== "consignacion");
  const tiendas = ubics.filter((u) => u.tipo === "consignacion");
  const enTiendas = (fila: Map<string, number> | Record<string, number>) => tiendas.reduce((s, u) => s + (fila instanceof Map ? fila.get(u.id) ?? 0 : fila[u.id] ?? 0), 0);
  const dispPorLote = new Map<string, Record<string, number>>();
  const matriz = new Map<string, Map<string, number>>();
  for (const e of existencias ?? []) {
    if (!dispPorLote.has(e.lote_id)) dispPorLote.set(e.lote_id, {});
    dispPorLote.get(e.lote_id)![e.ubicacion_id] = (dispPorLote.get(e.lote_id)![e.ubicacion_id] ?? 0) + e.cantidad;
    if (!matriz.has(e.producto_id)) matriz.set(e.producto_id, new Map());
    matriz.get(e.producto_id)!.set(e.ubicacion_id, (matriz.get(e.producto_id)!.get(e.ubicacion_id) ?? 0) + e.cantidad);
  }
  const lotesInfo = (lotes ?? []).map((l) => ({ id: l.id, codigo: l.codigo, fecha_caducidad: l.fecha_caducidad, producto: (l.productos as unknown as { nombre: string } | null)?.nombre ?? "", disponible: dispPorLote.get(l.id) ?? {} }));
  const lotesConStock = lotesInfo.filter((l) => Object.values(l.disponible).some((v) => v > 0));
  const totalAlmacen = almacen ? [...matriz.values()].reduce((s, f) => s + (f.get(almacen.id) ?? 0), 0) : 0;
  const totalConsig = [...matriz.values()].reduce((s, f) => s + ubics.filter((u) => u.tipo === "consignacion").reduce((t, u) => t + (f.get(u.id) ?? 0), 0), 0);
  const proximos = lotesConStock.filter((l) => { const d = diasHasta(l.fecha_caducidad); return d != null && d < 45; }).length;

  return (
    <>
      <PageHeader title="Inventario" subtitle="Existencias por producto y ubicación, calculadas a partir de los movimientos. El detalle por tienda está en cada punto de venta." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="En almacén" value={num(totalAlmacen)} hint="bolsas" />
        <Stat label="En consignación" value={num(totalConsig)} hint="bolsas en tiendas" />
        <Stat label="Lotes con stock" value={String(lotesConStock.length)} />
        <Stat label="Por caducar" value={String(proximos)} hint="lotes a menos de 45 días" color={proximos ? "red" : "brand"} />
      </div>

      <Card title="Existencias" className="mb-4" padded={false}>
        {!productos?.length ? <Empty>Sin productos.</Empty> : (
          <table>
            <thead><tr><th>Producto</th>{propias.map((u) => <th key={u.id} className="text-right">{u.nombre}</th>)}{tiendas.length > 0 && <th className="text-right">En tiendas ({tiendas.length})</th>}<th className="text-right">Total</th></tr></thead>
            <tbody>
              {productos.map((p) => {
                const fila = matriz.get(p.id) ?? new Map<string, number>();
                const total = [...fila.values()].reduce((s, v) => s + v, 0);
                const enAlm = almacen ? fila.get(almacen.id) ?? 0 : total;
                return (
                  <tr key={p.id}>
                    <td className="font-medium">{p.nombre} {enAlm === 0 ? <Badge color="red">Sin stock</Badge> : enAlm < 50 ? <Badge color="orange">Bajo</Badge> : null}</td>
                    {propias.map((u) => <td key={u.id} className="text-right">{num(fila.get(u.id) ?? 0)}</td>)}
                    {tiendas.length > 0 && <td className="text-right">{num(enTiendas(fila))}</td>}
                    <td className="text-right font-semibold">{num(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Enviar producto a una tienda (traslado)" open={!!trasladoA}><TrasladoForm lotes={lotesInfo} ubicaciones={ubics} destinoInicial={trasladoA} /></Panel>
        <Panel title="Ajuste por conteo o merma"><AjusteForm lotes={lotesInfo} ubicaciones={ubics} /></Panel>
      </div>

      <Card title="Detalle por lote" className="mb-4" padded={false}>
        {!lotesConStock.length ? <Empty>Sin existencias. Registra un lote en Producción y márcalo como recibido.</Empty> : (
          <table>
            <thead><tr><th>Producto</th><th>Lote</th><th>Caducidad</th>{propias.map((u) => <th key={u.id} className="text-right">{u.nombre}</th>)}{tiendas.length > 0 && <th className="text-right">En tiendas</th>}</tr></thead>
            <tbody>
              {lotesConStock.map((l) => {
                const dias = diasHasta(l.fecha_caducidad);
                return (
                  <tr key={l.id}>
                    <td>{l.producto}</td>
                    <td className="font-mono text-xs">{l.codigo}</td>
                    <td>{fecha(l.fecha_caducidad) || "—"} {dias != null && dias < 45 && <Badge color={dias < 0 ? "red" : "orange"}>{dias < 0 ? "Caducado" : `${dias} días`}</Badge>}</td>
                    {propias.map((u) => <td key={u.id} className="text-right">{l.disponible[u.id] ? num(l.disponible[u.id]) : <span className="text-ink-soft">·</span>}</td>)}
                    {tiendas.length > 0 && <td className="text-right">{enTiendas(l.disponible) ? num(enTiendas(l.disponible)) : <span className="text-ink-soft">·</span>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Panel title="Últimos movimientos">
        {!movimientos?.length ? <Empty>Sin movimientos.</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Lote</th><th>Ubicación</th><th className="text-right">Bolsas</th><th>Nota</th></tr></thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{fecha(m.fecha)}</td><td>{tipoMov[m.tipo]}</td>
                  <td>{(m.productos as unknown as { nombre: string } | null)?.nombre}</td>
                  <td className="font-mono text-xs">{(m.lotes as unknown as { codigo: string } | null)?.codigo}</td>
                  <td>{(m.ubicaciones as unknown as { nombre: string } | null)?.nombre}</td>
                  <td className={`text-right font-medium ${m.cantidad < 0 ? "text-red-600" : "text-brand"}`}>{m.cantidad > 0 ? "+" : ""}{num(m.cantidad)}</td>
                  <td className="text-ink-soft">{m.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
