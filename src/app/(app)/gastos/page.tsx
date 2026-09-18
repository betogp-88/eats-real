import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Button, Empty, Stat } from "@/components/ui";
import { money, fecha, hoy, CATEGORIAS_GASTO } from "@/lib/utils";
import { crearGasto, eliminarGasto } from "./actions";

export default async function GastosPage() {
  const supabase = await createClient();
  const { data: gastos } = await supabase.from("gastos").select("*").order("fecha", { ascending: false }).limit(300);
  const mes = hoy().slice(0, 7);
  const delMes = (gastos ?? []).filter((g) => g.fecha.startsWith(mes));
  const totalMes = delMes.reduce((s, g) => s + Number(g.monto), 0);
  const porCat = new Map<string, number>();
  for (const g of delMes) porCat.set(g.categoria, (porCat.get(g.categoria) ?? 0) + Number(g.monto));

  return (
    <>
      <PageHeader title="Gastos" subtitle="Gastos operativos que alimentan el estado de resultados" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Este mes" value={money(totalMes)} />
        {[...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => <Stat key={c} label={c} value={money(v)} />)}
      </div>
      <Card title="Registrar gasto" className="mb-4">
        <form action={crearGasto} className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div><label>Fecha</label><input name="fecha" type="date" required defaultValue={hoy()} /></div>
          <div><label>Categoría</label><select name="categoria" required>{CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>Proveedor</label><input name="proveedor" /></div>
          <div><label>Monto</label><input name="monto" type="number" step="0.01" min="0" required /></div>
          <div><label>Nota</label><input name="nota" /></div>
          <Button type="submit">Agregar</Button>
        </form>
      </Card>
      <Card title="Historial">
        {!gastos?.length ? <Empty>Sin gastos registrados.</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Categoría</th><th>Proveedor</th><th>Nota</th><th className="text-right">Monto</th><th></th></tr></thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td>{fecha(g.fecha)}</td>
                  <td>{g.categoria}</td>
                  <td>{g.proveedor ?? "—"}</td>
                  <td className="text-ink-soft">{g.nota}</td>
                  <td className="text-right font-medium">{money(g.monto)}</td>
                  <td className="text-right"><form action={eliminarGasto.bind(null, g.id)}><button className="text-xs text-red-600 hover:underline">Quitar</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
