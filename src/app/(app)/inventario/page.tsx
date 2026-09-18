import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Empty, Badge } from "@/components/ui";
import { num, fecha } from "@/lib/utils";
import { TrasladoForm, AjusteForm } from "./forms";

const tipoMov: Record<string, string> = { entrada_lote: "Entrada de lote", salida_venta: "Venta", traslado: "Traslado", ajuste: "Ajuste", merma: "Merma" };

export default async function InventarioPage() {
  const supabase = await createClient();
  const [{ data: existencias }, { data: ubicaciones }, { data: productos }, { data: lotes }, { data: movimientos }] = await Promise.all([
    supabase.from("existencias").select("producto_id, lote_id, ubicacion_id, cantidad"),
    supabase.from("ubicaciones").select("id, nombre, tipo").eq("activo", true).order("tipo").order("nombre"),
    supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("lotes").select("id, codigo, fecha_caducidad, productos(nombre)").neq("estado", "borrador").order("fecha_produccion"),
    supabase.from("movimientos_inv").select("id, fecha, tipo, cantidad, nota, productos(nombre), lotes(codigo), ubicaciones(nombre)").order("fecha", { ascending: false }).limit(50),
  ]);

  const ubics = ubicaciones ?? [];
  const lotesMap = new Map((lotes ?? []).map((l) => [l.id, { ...l, producto: (l.productos as unknown as { nombre: string } | null)?.nombre ?? "" }]));
  const lotesOpc = [...lotesMap.values()].map((l) => ({ id: l.id, codigo: l.codigo, producto: l.producto }));

  // Matriz producto × ubicación
  const matriz = new Map<string, Map<string, number>>();
  for (const e of existencias ?? []) {
    if (!matriz.has(e.producto_id)) matriz.set(e.producto_id, new Map());
    const fila = matriz.get(e.producto_id)!;
    fila.set(e.ubicacion_id, (fila.get(e.ubicacion_id) ?? 0) + e.cantidad);
  }

  // Detalle por lote (solo con existencias)
  const porLote = (existencias ?? [])
    .map((e) => ({ ...e, lote: lotesMap.get(e.lote_id), ubic: ubics.find((u) => u.id === e.ubicacion_id) }))
    .filter((e) => e.lote)
    .sort((a, b) => (a.lote!.producto + a.lote!.codigo).localeCompare(b.lote!.producto + b.lote!.codigo));

  return (
    <>
      <PageHeader title="Inventario" subtitle="Existencias derivadas del libro de movimientos" />
      <Card title="Existencias por producto y ubicación" className="mb-4">
        <table>
          <thead><tr><th>Producto</th>{ubics.map((u) => <th key={u.id} className="text-right">{u.nombre}</th>)}<th className="text-right">Total</th></tr></thead>
          <tbody>
            {(productos ?? []).map((p) => {
              const fila = matriz.get(p.id) ?? new Map<string, number>();
              const total = [...fila.values()].reduce((s, v) => s + v, 0);
              return (
                <tr key={p.id}>
                  <td className="font-medium">{p.nombre}</td>
                  {ubics.map((u) => <td key={u.id} className="text-right">{num(fila.get(u.id) ?? 0)}</td>)}
                  <td className="text-right font-semibold">{num(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Traslado entre ubicaciones (consignación)"><TrasladoForm lotes={lotesOpc} ubicaciones={ubics} /></Card>
        <Card title="Ajuste o merma"><AjusteForm lotes={lotesOpc} ubicaciones={ubics} /></Card>
      </div>
      <Card title="Detalle por lote" className="mb-4">
        {!porLote.length ? <Empty>Sin existencias.</Empty> : (
          <table>
            <thead><tr><th>Producto</th><th>Lote</th><th>Caducidad</th><th>Ubicación</th><th className="text-right">Bolsas</th></tr></thead>
            <tbody>
              {porLote.map((e) => (
                <tr key={`${e.lote_id}-${e.ubicacion_id}`}>
                  <td>{e.lote!.producto}</td>
                  <td className="font-mono text-xs">{e.lote!.codigo}</td>
                  <td>{fecha(e.lote!.fecha_caducidad) || "—"}</td>
                  <td><Badge color={e.ubic?.tipo === "almacen" ? "green" : "orange"}>{e.ubic?.nombre}</Badge></td>
                  <td className="text-right">{num(e.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Últimos movimientos">
        {!movimientos?.length ? <Empty>Sin movimientos.</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Lote</th><th>Ubicación</th><th className="text-right">Cantidad</th><th>Nota</th></tr></thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{fecha(m.fecha)}</td>
                  <td>{tipoMov[m.tipo]}</td>
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
      </Card>
    </>
  );
}
