import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Button, Empty, Stat } from "@/components/ui";
import { money, fecha, hoy, CANALES_MARKETING } from "@/lib/utils";
import { crearGastoMarketing, eliminarGastoMarketing } from "./actions";

export default async function MarketingPage() {
  const supabase = await createClient();
  const { data: gastos } = await supabase.from("gastos_marketing").select("*").order("fecha_inicio", { ascending: false }).limit(200);
  const mes = hoy().slice(0, 7);
  const totalMes = (gastos ?? []).filter((g) => g.fecha_inicio.startsWith(mes)).reduce((s, g) => s + Number(g.monto), 0);
  const porCanal = new Map<string, number>();
  for (const g of gastos ?? []) if (g.fecha_inicio.startsWith(mes)) porCanal.set(g.canal, (porCanal.get(g.canal) ?? 0) + Number(g.monto));

  return (
    <>
      <PageHeader title="Marketing" subtitle="Inversión en publicidad por canal. Captura manual; la conexión con Meta y Google Ads viene después." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Este mes" value={money(totalMes)} />
        {[...porCanal.entries()].slice(0, 3).map(([c, v]) => <Stat key={c} label={c} value={money(v)} />)}
      </div>
      <Card title="Registrar inversión" className="mb-4">
        <form action={crearGastoMarketing} className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div><label>Canal</label><select name="canal" required>{CANALES_MARKETING.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>Campaña</label><input name="campana" placeholder="Opcional" /></div>
          <div><label>Desde</label><input name="fecha_inicio" type="date" required defaultValue={hoy().slice(0, 8) + "01"} /></div>
          <div><label>Hasta</label><input name="fecha_fin" type="date" required defaultValue={hoy()} /></div>
          <div><label>Monto</label><input name="monto" type="number" step="0.01" min="0" required /></div>
          <Button type="submit">Agregar</Button>
        </form>
      </Card>
      <Card title="Historial">
        {!gastos?.length ? <Empty>Sin registros.</Empty> : (
          <table>
            <thead><tr><th>Periodo</th><th>Canal</th><th>Campaña</th><th className="text-right">Monto</th><th></th></tr></thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td className="whitespace-nowrap">{fecha(g.fecha_inicio)} – {fecha(g.fecha_fin)}</td>
                  <td>{g.canal}</td>
                  <td className="text-ink-soft">{g.campana ?? "—"}</td>
                  <td className="text-right font-medium">{money(g.monto)}</td>
                  <td className="text-right"><form action={eliminarGastoMarketing.bind(null, g.id)}><button className="text-xs text-red-600 hover:underline">Quitar</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
