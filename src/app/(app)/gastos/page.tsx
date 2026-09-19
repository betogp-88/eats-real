import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Empty, Stat, Tabs } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { money, fecha, hoy } from "@/lib/utils";
import { tabsGastos } from "@/lib/nav";
import { GastoForm, MarketingForm } from "./forms";
import { eliminarGasto, eliminarGastoMarketing } from "./actions";

export default async function GastosPage({ searchParams }: PageProps<"/gastos">) {
  const sp = await searchParams;
  const tab = sp.tab === "marketing" ? "marketing" : "operativos";
  const supabase = await createClient();
  const mes = hoy().slice(0, 7);

  if (tab === "marketing") {
    const { data: gastos } = await supabase.from("gastos_marketing").select("*").order("fecha_inicio", { ascending: false }).limit(200);
    const delMes = (gastos ?? []).filter((g) => g.fecha_inicio.startsWith(mes));
    const porCanal = new Map<string, number>();
    for (const g of delMes) porCanal.set(g.canal, (porCanal.get(g.canal) ?? 0) + Number(g.monto));
    return (
      <>
        <PageHeader title="Gastos y marketing" subtitle="Inversión en publicidad por canal. La conexión con Meta y Google Ads viene en una fase posterior." />
        <Tabs items={tabsGastos} current="marketing" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Marketing este mes" value={money(delMes.reduce((s, g) => s + Number(g.monto), 0))} />
          {[...porCanal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => <Stat key={c} label={c} value={money(v)} color="ink" />)}
        </div>
        <Card title="Registrar inversión" className="mb-4"><MarketingForm /></Card>
        <Card title="Historial" padded={false}>
          {!gastos?.length ? <Empty>Sin registros.</Empty> : (
            <table>
              <thead><tr><th>Periodo</th><th>Canal</th><th>Campaña</th><th className="text-right">Monto</th><th></th></tr></thead>
              <tbody>{gastos.map((g) => (
                <tr key={g.id}>
                  <td className="whitespace-nowrap">{fecha(g.fecha_inicio)} – {fecha(g.fecha_fin)}</td><td>{g.canal}</td><td className="text-ink-soft">{g.campana ?? "—"}</td>
                  <td className="text-right font-medium">{money(g.monto)}</td>
                  <td className="text-right"><ConfirmButton action={async () => { "use server"; return eliminarGastoMarketing(g.id); }} confirmText="¿Eliminar este registro?" variant="ghost">Eliminar</ConfirmButton></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      </>
    );
  }

  const { data: gastos } = await supabase.from("gastos").select("*").order("fecha", { ascending: false }).limit(300);
  const delMes = (gastos ?? []).filter((g) => g.fecha.startsWith(mes));
  const porCat = new Map<string, number>();
  for (const g of delMes) porCat.set(g.categoria, (porCat.get(g.categoria) ?? 0) + Number(g.monto));
  return (
    <>
      <PageHeader title="Gastos y marketing" subtitle="Gastos operativos del negocio. Alimentan el estado de resultados." />
      <Tabs items={tabsGastos} current="operativos" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Gastos este mes" value={money(delMes.reduce((s, g) => s + Number(g.monto), 0))} />
        {[...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => <Stat key={c} label={c} value={money(v)} color="ink" />)}
      </div>
      <Card title="Registrar gasto" className="mb-4"><GastoForm /></Card>
      <Card title="Historial" padded={false}>
        {!gastos?.length ? <Empty>Sin gastos registrados.</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Categoría</th><th>Proveedor</th><th>Nota</th><th className="text-right">Monto</th><th></th></tr></thead>
            <tbody>{gastos.map((g) => (
              <tr key={g.id}>
                <td>{fecha(g.fecha)}</td><td>{g.categoria}</td><td>{g.proveedor ?? "—"}</td><td className="text-ink-soft">{g.nota}</td>
                <td className="text-right font-medium">{money(g.monto)}</td>
                <td className="text-right"><ConfirmButton action={async () => { "use server"; return eliminarGasto(g.id); }} confirmText="¿Eliminar este gasto?" variant="ghost">Eliminar</ConfirmButton></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}
