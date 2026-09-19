import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Stat, Empty, WhatsApp, LinkButton } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { money, fecha, diasTexto, semaforo, CANALES, ESTADOS_PEDIDO } from "@/lib/utils";
import { ClienteForm } from "../form";
import { eliminarCliente } from "../actions";

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  if (id === "nuevo") {
    return (<><PageHeader title="Nuevo cliente" back={{ href: "/clientes", label: "Clientes" }} /><Card className="max-w-2xl"><ClienteForm /></Card></>);
  }
  const supabase = await createClient();
  const [{ data: cliente }, { data: resumen }, { data: pedidos }, { data: lineas }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
    supabase.from("clientes_resumen").select("*").eq("cliente_id", id).maybeSingle(),
    supabase.from("pedidos").select("id, fecha, canal, ref_externa, estado, descuento, envio_cobrado, pedido_lineas(cantidad, precio_unitario)").eq("cliente_id", id).order("fecha", { ascending: false }).limit(50),
    supabase.from("ventas_detalle").select("producto, cantidad").eq("cliente_id", id),
  ]);
  if (!cliente) notFound();
  const s = semaforo(resumen?.dias_sin_comprar);
  const favoritos = new Map<string, number>();
  for (const l of lineas ?? []) favoritos.set(l.producto, (favoritos.get(l.producto) ?? 0) + l.cantidad);
  const top = [...favoritos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <>
      <PageHeader title={cliente.nombre} subtitle={[cliente.telefono, cliente.email].filter(Boolean).join(" · ")} back={{ href: "/clientes", label: "Clientes" }}
        actions={<><Badge color={s.color}>{s.label}</Badge><WhatsApp telefono={cliente.telefono}><span className="rounded-lg bg-brand-light/20 px-3 py-1.5">Escribir por WhatsApp</span></WhatsApp><LinkButton href={`/pedidos/nuevo?cliente=${cliente.id}`} variant="accent">Nuevo pedido</LinkButton></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Última compra" value={resumen?.ultima_compra ? diasTexto(resumen.dias_sin_comprar) : "Nunca"} hint={fecha(resumen?.ultima_compra)} />
        <Stat label="Pedidos" value={String(resumen?.pedidos ?? 0)} hint={resumen?.primera_compra ? `Cliente desde ${fecha(resumen.primera_compra)}` : undefined} />
        <Stat label="Total comprado" value={money(resumen?.total_comprado)} />
        <Stat label="Le gusta" value={top[0]?.[0] ?? "—"} hint={top.slice(1).map(([n, q]) => `${n} (${q})`).join(", ")} color="ink" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Historial de pedidos">
          {!pedidos?.length ? <Empty>Sin pedidos todavía.</Empty> : (
            <table>
              <thead><tr><th>Fecha</th><th>Canal</th><th className="text-right">Bolsas</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {pedidos.map((p) => {
                  const ls = p.pedido_lineas as unknown as { cantidad: number; precio_unitario: number }[];
                  const total = ls.reduce((s, l) => s + l.cantidad * Number(l.precio_unitario), 0) - Number(p.descuento) + Number(p.envio_cobrado);
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/pedidos/${p.id}`} className="text-brand hover:underline">{fecha(p.fecha)}</Link></td>
                      <td>{CANALES[p.canal]}</td>
                      <td className="text-right">{ls.reduce((s, l) => s + l.cantidad, 0)}</td>
                      <td className="text-right">{money(total)}</td>
                      <td><Badge color={p.estado === "despachado" ? "green" : p.estado === "cancelado" ? "red" : "orange"}>{ESTADOS_PEDIDO[p.estado]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Datos de contacto" actions={<ConfirmButton action={async () => { "use server"; return eliminarCliente(id); }} confirmText="¿Eliminar este cliente?">Eliminar</ConfirmButton>}>
          <ClienteForm cliente={cliente} />
        </Card>
      </div>
    </>
  );
}
