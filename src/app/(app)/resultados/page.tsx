import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Empty, Stat } from "@/components/ui";
import { money, mesActual, CANALES } from "@/lib/utils";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const nombreMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

function Tabla({ titulo, datos }: { titulo: string; datos: [string, { cantidad: number; venta: number; costo: number }][] }) {
return (
  <Card title={titulo}>
    {!datos.length ? <Empty>Sin ventas en el mes.</Empty> : (
      <table>
        <thead><tr><th></th><th className="text-right">Bolsas</th><th className="text-right">Venta</th><th className="text-right">Costo</th><th className="text-right">Margen</th><th className="text-right">%</th></tr></thead>
        <tbody>
          {datos.map(([k, v]) => (
            <tr key={k}><td className="font-medium">{k}</td><td className="text-right">{v.cantidad}</td><td className="text-right">{money(v.venta)}</td><td className="text-right">{money(v.costo)}</td><td className="text-right">{money(v.venta - v.costo)}</td><td className="text-right">{v.venta > 0 ? `${(((v.venta - v.costo) / v.venta) * 100).toFixed(0)}%` : "—"}</td></tr>
          ))}
        </tbody>
      </table>
    )}
  </Card>
);
}

export default async function ResultadosPage({ searchParams }: PageProps<"/resultados">) {
  const sp = await searchParams;
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesActual();
  const inicio = `${mes}-01`;
  const fin = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: meses }, { data: detalle }] = await Promise.all([
    supabase.from("resultados_mensuales").select("*").limit(12),
    supabase.from("ventas_detalle").select("canal, producto, cantidad, venta, costo").gte("fecha", inicio).lte("fecha", fin),
  ]);

  const r = (meses ?? []).find((m) => m.mes === inicio);
  const ventas = Number(r?.ventas_netas ?? 0);
  const costo = Number(r?.costo_venta ?? 0);
  const bruta = ventas - costo;
  const operativa = bruta - Number(r?.comisiones ?? 0) - Number(r?.costo_envio ?? 0) - Number(r?.marketing ?? 0) - Number(r?.gastos ?? 0);
  const pct = (n: number) => (ventas > 0 ? `${((n / ventas) * 100).toFixed(1)}%` : "—");

  const agrupar = (key: "canal" | "producto") => {
    const m = new Map<string, { cantidad: number; venta: number; costo: number }>();
    for (const d of detalle ?? []) {
      const k = key === "canal" ? CANALES[d.canal] : d.producto;
      const cur = m.get(k) ?? { cantidad: 0, venta: 0, costo: 0 };
      m.set(k, { cantidad: cur.cantidad + d.cantidad, venta: cur.venta + Number(d.venta), costo: cur.costo + Number(d.costo) });
    }
    return [...m.entries()].sort((a, b) => b[1].venta - a[1].venta);
  };

  const filas: [string, number, string?][] = [
    ["Ventas brutas", Number(r?.ventas_brutas ?? 0)],
    ["Descuentos", -Number(r?.descuentos ?? 0)],
    ["Envío cobrado", Number(r?.envio_cobrado ?? 0)],
    ["Ventas netas", ventas, "total"],
    ["Costo de venta", -costo],
    ["Utilidad bruta", bruta, "total"],
    ["Comisiones de plataforma", -Number(r?.comisiones ?? 0)],
    ["Costo de envíos", -Number(r?.costo_envio ?? 0)],
    ["Marketing", -Number(r?.marketing ?? 0)],
    ["Gastos operativos", -Number(r?.gastos ?? 0)],
    ["Utilidad operativa", operativa, "total"],
  ];


  return (
    <>
      <PageHeader title="Estado de resultados" subtitle="Por mes. El costo de venta sale del despacho por lote; los pedidos pendientes aún no tienen costo." actions={
        <form className="flex gap-2 items-center"><input type="month" name="mes" defaultValue={mes} className="w-auto" /><button className="rounded-lg bg-brand text-white px-3 py-2 text-sm">Ver</button></form>
      } />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Ventas netas" value={money(ventas)} />
        <Stat label="Utilidad bruta" value={money(bruta)} hint={pct(bruta)} />
        <Stat label="Marketing + gastos" value={money(Number(r?.marketing ?? 0) + Number(r?.gastos ?? 0))} />
        <Stat label="Utilidad operativa" value={money(operativa)} hint={pct(operativa)} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title={`Estado de resultados · ${nombreMes(mes)}`}>
          <table>
            <tbody>
              {filas.map(([k, v, t]) => (
                <tr key={k} className={t ? "font-semibold bg-muted/60" : ""}><td>{k}</td><td className={`text-right ${v < 0 && !t ? "text-red-600" : ""}`}>{money(v)}</td><td className="text-right text-ink-soft w-16">{t ? pct(v) : ""}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Últimos meses">
          {!meses?.length ? <Empty>Sin datos.</Empty> : (
            <table>
              <thead><tr><th>Mes</th><th className="text-right">Ventas netas</th><th className="text-right">Ut. bruta</th><th className="text-right">Ut. operativa</th></tr></thead>
              <tbody>
                {meses.map((m) => {
                  const vb = Number(m.ventas_netas) - Number(m.costo_venta);
                  const vo = vb - Number(m.comisiones) - Number(m.costo_envio) - Number(m.marketing) - Number(m.gastos);
                  return (
                    <tr key={m.mes} className={m.mes === inicio ? "bg-muted/60" : ""}>
                      <td><Link href={`/resultados?mes=${m.mes.slice(0, 7)}`} className="text-brand hover:underline">{nombreMes(m.mes)}</Link></td>
                      <td className="text-right">{money(m.ventas_netas)}</td>
                      <td className="text-right">{money(vb)}</td>
                      <td className={`text-right font-medium ${vo < 0 ? "text-red-600" : ""}`}>{money(vo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Tabla titulo="Margen por producto" datos={agrupar("producto")} />
        <Tabla titulo="Margen por canal" datos={agrupar("canal")} />
      </div>
    </>
  );
}
