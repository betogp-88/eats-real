import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Empty, Chip } from "@/components/ui";
import { money, fecha, CANALES, ESTADOS_PEDIDO } from "@/lib/utils";

const colorEstado = { pendiente: "orange", despachado: "green", cancelado: "red" } as const;

export default async function PedidosPage({ searchParams }: PageProps<"/pedidos">) {
  const sp = await searchParams;
  const estado = typeof sp.estado === "string" ? sp.estado : "";
  const canal = typeof sp.canal === "string" ? sp.canal : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const supabase = await createClient();
  let query = supabase.from("pedidos").select("id, canal, ref_externa, fecha, cliente_nombre, estado, descuento, envio_cobrado, pedido_lineas(cantidad, precio_unitario)").order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(200);
  if (estado) query = query.eq("estado", estado);
  if (canal) query = query.eq("canal", canal);
  if (q) query = query.or(`ref_externa.ilike.%${q}%,cliente_nombre.ilike.%${q}%`);
  const { data: pedidos } = await query;
  const link = (patch: Record<string, string>) => `/pedidos?${new URLSearchParams(Object.fromEntries(Object.entries({ estado, canal, q, ...patch }).filter(([, v]) => v)))}`;

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Ventas de todos los canales y su despacho" actions={<><LinkButton href="/pedidos/importar" variant="secondary">Importar Amazon</LinkButton><LinkButton href="/pedidos/nuevo" variant="accent">Nuevo pedido</LinkButton></>} />
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <form className="flex gap-2">{estado && <input type="hidden" name="estado" value={estado} />}{canal && <input type="hidden" name="canal" value={canal} />}<input name="q" defaultValue={q} placeholder="Buscar por cliente o referencia" className="w-60" /><button className="rounded-lg bg-white border border-line px-3 text-sm">Buscar</button></form>
        <span className="hidden sm:block w-px h-6 bg-line mx-1" />
        <Chip href={link({ estado: "" })} active={!estado}>Todos</Chip>
        {Object.entries(ESTADOS_PEDIDO).map(([k, v]) => <Chip key={k} href={link({ estado: k })} active={estado === k}>{v}</Chip>)}
        <span className="hidden sm:block w-px h-6 bg-line mx-1" />
        <Chip href={link({ canal: "" })} active={!canal}>Todos los canales</Chip>
        {Object.entries(CANALES).filter(([k]) => k !== "consignacion").map(([k, v]) => <Chip key={k} href={link({ canal: k })} active={canal === k}>{v}</Chip>)}
      </div>
      <Card padded={false}>
        {!pedidos?.length ? <Empty action={<LinkButton href="/pedidos/nuevo" variant="secondary">Capturar un pedido</LinkButton>}>{q || estado || canal ? "No hay pedidos con ese filtro." : "Aún no hay pedidos."}</Empty> : (
          <table>
            <thead><tr><th>Fecha</th><th>Cliente / tienda</th><th>Canal</th><th>Ref.</th><th className="text-right">Bolsas</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {pedidos.map((p) => {
                const lineas = p.pedido_lineas as unknown as { cantidad: number; precio_unitario: number }[];
                const bolsas = lineas.reduce((s, l) => s + l.cantidad, 0);
                const total = lineas.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0) - Number(p.descuento) + Number(p.envio_cobrado);
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap"><Link href={`/pedidos/${p.id}`} className="text-brand hover:underline font-medium">{fecha(p.fecha)}</Link></td>
                    <td>{p.cliente_nombre ?? <span className="text-ink-soft">—</span>}</td>
                    <td><Badge color="green">{CANALES[p.canal]}</Badge></td>
                    <td className="text-ink-soft text-xs">{p.ref_externa ?? ""}</td>
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
