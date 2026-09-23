import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Empty, Badge, Stat } from "@/components/ui";
import { money, fecha, num } from "@/lib/utils";

const RESULTADO: Record<string, string> = { venta: "Normal", sin_pedido: "Sin movimiento", cerrada: "Cerrada", no_encontrada: "Sin encargado", ya_no_vende: "Ya no vende" };

export default async function VisitasPage() {
  const supabase = await createClient();
  const { data: visitas } = await supabase.from("visitas").select("id, fecha, resultado, vendido, repuesto, cobro_monto, cobro_metodo, fotos, puntos_venta(nombre), rutas(nombre)").order("fecha", { ascending: false }).limit(200);
  const hoy = new Date().toISOString().slice(0, 10);
  const deHoy = (visitas ?? []).filter((v) => v.fecha.startsWith(hoy));
  return (
    <>
      <PageHeader title="Visitas" subtitle="Historial de visitas a puntos de venta" back={{ href: "/rutas", label: "Rutas" }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Visitas hoy" value={num(deHoy.length)} />
        <Stat label="Vendido hoy" value={`${num(deHoy.reduce((s, v) => s + v.vendido, 0))} bolsas`} />
        <Stat label="Cobrado hoy" value={money(deHoy.reduce((s, v) => s + Number(v.cobro_monto), 0))} />
        <Stat label="Repuesto hoy" value={`${num(deHoy.reduce((s, v) => s + v.repuesto, 0))} bolsas`} color="ink" />
      </div>
      <Card padded={false}>
        {!visitas?.length ? <Empty>Sin visitas todavía.</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Tienda</th><th>Ruta</th><th>Resultado</th><th className="text-right">Vendió</th><th className="text-right">Repuso</th><th className="text-right">Cobró</th><th></th></tr></thead>
            <tbody>{visitas.map((v) => (
              <tr key={v.id}>
                <td className="whitespace-nowrap"><Link href={`/visitas/${v.id}`} className="text-brand hover:underline">{fecha(v.fecha)}</Link></td>
                <td>{(v.puntos_venta as unknown as { nombre: string } | null)?.nombre}</td>
                <td className="text-ink-soft">{(v.rutas as unknown as { nombre: string } | null)?.nombre ?? "—"}</td>
                <td><Badge color={v.resultado === "venta" ? "green" : "gray"}>{RESULTADO[v.resultado]}</Badge></td>
                <td className="text-right">{v.vendido}</td><td className="text-right">{v.repuesto}</td>
                <td className="text-right">{money(v.cobro_monto)} {v.cobro_metodo === "pendiente" && <Badge color="red">Pendiente</Badge>}</td>
                <td className="text-right text-xs text-ink-soft">{v.fotos?.length ? `${v.fotos.length} foto(s)` : ""}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}
