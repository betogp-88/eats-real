import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Button, Stat } from "@/components/ui";
import { money, num, ESTADOS_LOTE, CONCEPTOS_LOTE } from "@/lib/utils";
import { LoteForm } from "../form";
import { agregarCosto, eliminarCosto, cerrarLote } from "../actions";
import { BotonRecibir, BotonEliminar } from "./acciones";

export default async function LotePage({ params }: PageProps<"/lotes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: productos }, { data: maquiladores }] = await Promise.all([
    supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("maquiladores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (id === "nuevo") {
    return (
      <>
        <PageHeader title="Nuevo lote" subtitle="Primero crea el lote; después captura sus costos" />
        <Card className="max-w-2xl"><LoteForm productos={productos ?? []} maquiladores={maquiladores ?? []} /></Card>
      </>
    );
  }

  const [{ data: lote }, { data: costos }, { data: existencias }] = await Promise.all([
    supabase.from("lotes").select("*, productos(nombre)").eq("id", id).maybeSingle(),
    supabase.from("lote_costos").select("*").eq("lote_id", id).order("concepto"),
    supabase.from("existencias").select("cantidad, ubicaciones(nombre)").eq("lote_id", id),
  ]);
  if (!lote) notFound();
  const producto = (lote.productos as unknown as { nombre: string } | null)?.nombre;
  const editable = lote.estado !== "cerrado";
  const enStock = (existencias ?? []).reduce((s, e) => s + e.cantidad, 0);

  return (
    <>
      <PageHeader
        title={`Lote ${lote.codigo}`}
        subtitle={producto}
        actions={
          <>
            <Badge color={lote.estado === "recibido" ? "green" : lote.estado === "cerrado" ? "orange" : "gray"}>{ESTADOS_LOTE[lote.estado]}</Badge>
            {lote.estado === "borrador" && <BotonEliminar id={lote.id} />}
            {lote.estado === "recibido" && (
              <form action={cerrarLote.bind(null, lote.id)}><Button variant="secondary" type="submit">Cerrar lote</Button></form>
            )}
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Bolsas finales" value={num(lote.bolsas_finales)} />
        <Stat label="Costo total" value={money(lote.costo_total)} />
        <Stat label="Costo por bolsa" value={money(lote.costo_unitario, 2)} hint="Costo total ÷ bolsas finales" />
        <Stat label="En inventario" value={num(enStock)} hint={(existencias ?? []).map((e) => `${(e.ubicaciones as unknown as { nombre: string } | null)?.nombre}: ${e.cantidad}`).join(" · ") || "Sin entrada aún"} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Datos del lote">
          <LoteForm lote={lote} productos={productos ?? []} maquiladores={maquiladores ?? []} />
        </Card>
        <Card title="Costos del lote">
          <table className="mb-4">
            <thead><tr><th>Concepto</th><th className="text-right">Monto</th><th></th></tr></thead>
            <tbody>
              {!costos?.length && <tr><td colSpan={3} className="text-center text-ink-soft py-4">Sin costos capturados.</td></tr>}
              {costos?.map((c) => (
                <tr key={c.id}>
                  <td>{c.concepto}</td>
                  <td className="text-right">{money(c.monto)}</td>
                  <td className="text-right">{editable && <form action={eliminarCosto.bind(null, lote.id, c.id)}><button className="text-xs text-red-600 hover:underline">Quitar</button></form>}</td>
                </tr>
              ))}
              <tr className="font-semibold"><td>Total</td><td className="text-right">{money(lote.costo_total)}</td><td></td></tr>
            </tbody>
          </table>
          {editable && (
            <form action={agregarCosto.bind(null, lote.id)} className="flex gap-2 items-end">
              <div className="flex-1"><label>Concepto</label><input name="concepto" list="conceptos" required placeholder="Maquila" /><datalist id="conceptos">{CONCEPTOS_LOTE.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div className="w-36"><label>Monto</label><input name="monto" type="number" step="0.01" min="0" required /></div>
              <Button type="submit" variant="secondary">Agregar</Button>
            </form>
          )}
          {lote.estado === "borrador" && (
            <div className="mt-6 pt-4 border-t border-line">
              <p className="text-sm text-ink-soft mb-3">Cuando el lote llegue físicamente al almacén, márcalo como recibido. Se creará la entrada de inventario con las bolsas finales.</p>
              <BotonRecibir id={lote.id} disabled={lote.bolsas_finales <= 0} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
