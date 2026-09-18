import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Empty } from "@/components/ui";
import { money, fecha, CANALES, ESTADOS_PEDIDO } from "@/lib/utils";

const colorEstado = { pendiente: "orange", despachado: "green", cancelado: "red" } as const;

export default async function PedidosPage({ searchParams }: PageProps<"/pedidos">) {
  const sp = await searchParams;
  const estado = typeof sp.estado === "string" ? sp.estado : "";
  const canal = typeof sp.canal === "string" ? sp.canal : "";
  const supabase = await createClient();
  let q = supabase.from("pedidos").select("id, canal, ref_externa, fecha, cliente_nombre, estado, descuento, envio_cobrado, pedido_lineas(cantidad, precio_unitario)").order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(200);
  if (estado) q = q.eq("estado", estado);
  if (canal) q = q.eq("canal", canal);
  const { data: pedidos } = await q;

  const filtro = (k: string, v: string, label: string, actual: string) => (
    <Link href={`/pedidos?${new URLSearchParams({ estado, canal, [k]: v }).toString()}`} className={`rounded-full px-3 py-1 text-xs ${actual === v ? "bg-brand text-white" : "bg-white border border-line text-ink-soft hover:bg-muted"}`}>{label}</Link>
  );

  return (
    <>
      <PageHeader title="Ventas y despacho" subtitle="Pedidos de todos los canales" actions={<><LinkButton href="/pedidos/importar" variant="secondary">Importar Amazon</LinkButton><LinkButton href="/pedidos/nuevo">Nuevo pedido</LinkButton></>} />
      <div className="flex flex-wrap gap-2 mb-4">
        {filtro("estado", "", "Todos", estado)}{Object.entries(ESTADOS_PEDIDO).map(([k, v]) => <span key={k}>{filtro("estado", k, v, estado)}</span>)}
        <span className="w-px bg-line mx-1" />
        {filtro("canal", "", "Todos los canales", canal)}{Object.entries(CANALES).map(([k, v]) => <span key={k}>{filtro("canal", k, v, canal)}</span>)}
      </div>
      <Card>
        {!pedidos?.length ? <Empty>No hay pedidos con ese filtro.</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Canal</th><th>Referencia</th><th>Cliente</th><th className="text-right">Bolsas</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {pedidos.map((p) => {
                const lineas = p.pedido_lineas as unknown as { cantidad: number; precio_unitario: number }[];
                const bolsas = lineas.reduce((s, l) => s + l.cantidad, 0);
                const total = lineas.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0) - Number(p.descuento) + Number(p.envio_cobrado);
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{fecha(p.fecha)}</td>
                    <td><Badge color="green">{CANALES[p.canal]}</Badge></td>
                    <td><Link href={`/pedidos/${p.id}`} className="font-medium text-brand hover:underline">{p.ref_externa ?? p.id.slice(0, 8)}</Link></td>
                    <td>{p.cliente_nombre ?? "—"}</td>
                    <td className="text-right">{bolsas}</td>
                    <td className="text-right">{money(total)}</td>
                    <td><Badge color={colorEstado[p.estado as keyof typeof colorEstado]}>{ESTADOS_PEDIDO[p.estado]}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
