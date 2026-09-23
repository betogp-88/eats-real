import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Empty, WhatsApp } from "@/components/ui";
import { money, fecha, diasTexto, MODALIDADES, num } from "@/lib/utils";
import { empresa } from "@/lib/empresa";

export default async function PuntosVentaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("puntos_venta").select("id, nombre, contacto, telefono, modalidad, activo, puntos_venta_resumen(pedidos, total_vendido, ultimo_pedido, dias_entre_pedidos, dias_sin_pedir, inventario)").order("nombre");
  type Fila = { id: string; nombre: string; contacto: string | null; telefono: string | null; modalidad: string; activo: boolean; puntos_venta_resumen: { pedidos: number; total_vendido: number; ultimo_pedido: string | null; dias_entre_pedidos: number | null; dias_sin_pedir: number | null; inventario: number } | null };
  const filas = ((data ?? []) as unknown as Fila[]).map((p) => ({ ...p, r: p.puntos_venta_resumen }));
  const tocaVisitar = (r: Fila["puntos_venta_resumen"]) => r?.dias_entre_pedidos != null && r.dias_sin_pedir != null && r.dias_sin_pedir > r.dias_entre_pedidos;

  return (
    <>
      <PageHeader title="Puntos de venta" subtitle={`Tiendas y cafeterías que venden ${empresa.nombre}, a consignación o compra directa`} actions={<LinkButton href="/puntos-venta/nuevo">Nuevo punto de venta</LinkButton>} />
      <Card padded={false}>
        {!filas.length ? <Empty action={<LinkButton href="/puntos-venta/nuevo" variant="secondary">Agregar el primero</LinkButton>}>Aún no hay puntos de venta.</Empty> : (
          <table>
            <thead><tr><th>Tienda</th><th>Modalidad</th><th>Último pedido</th><th>Frecuencia</th><th className="text-right">Inventario ahí</th><th className="text-right">Pedidos</th><th className="text-right">Vendido</th><th></th></tr></thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id} className={!p.activo ? "opacity-50" : ""}>
                  <td>
                    <Link href={`/puntos-venta/${p.id}`} className="font-medium text-brand hover:underline">{p.nombre}</Link>
                    {p.contacto && <p className="text-xs text-ink-soft">{p.contacto}</p>}
                  </td>
                  <td><Badge color={p.modalidad === "consignacion" ? "orange" : "green"}>{MODALIDADES[p.modalidad]}</Badge></td>
                  <td>{p.r?.ultimo_pedido ? `${fecha(p.r.ultimo_pedido)} · ${diasTexto(p.r.dias_sin_pedir)}` : "—"} {tocaVisitar(p.r) && <Badge color="red">Toca visitar</Badge>}</td>
                  <td className="text-ink-soft">{p.r?.dias_entre_pedidos != null ? `Cada ${p.r.dias_entre_pedidos} días` : "—"}</td>
                  <td className="text-right">{p.modalidad === "consignacion" ? num(p.r?.inventario ?? 0) : "—"}</td>
                  <td className="text-right">{p.r?.pedidos ?? 0}</td>
                  <td className="text-right">{money(p.r?.total_vendido)}</td>
                  <td className="text-right"><WhatsApp telefono={p.telefono} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
