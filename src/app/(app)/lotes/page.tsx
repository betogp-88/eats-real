import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Empty } from "@/components/ui";
import { money, num, fecha, ESTADOS_LOTE } from "@/lib/utils";

const colorEstado = { borrador: "gray", recibido: "green", cerrado: "orange" } as const;

export default async function LotesPage() {
  const supabase = await createClient();
  const { data: lotes } = await supabase
    .from("lotes")
    .select("id, codigo, fecha_produccion, fecha_caducidad, bolsas_finales, estado, costo_total, costo_unitario, productos(nombre), maquiladores(nombre)")
    .order("fecha_produccion", { ascending: false });

  return (
    <>
      <PageHeader title="Producción" subtitle="Lotes enviados a maquilar y su costo por bolsa" actions={<LinkButton href="/lotes/nuevo">Nuevo lote</LinkButton>} />
      <Card>
        {!lotes?.length ? <Empty>Aún no hay lotes. Crea el primero.</Empty> : (
          <table>
            <thead><tr><th>Código</th><th>Producto</th><th>Maquilador</th><th>Producción</th><th>Caducidad</th><th className="text-right">Bolsas</th><th className="text-right">Costo total</th><th className="text-right">Costo / bolsa</th><th>Estado</th></tr></thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/lotes/${l.id}`} className="font-medium text-brand hover:underline">{l.codigo}</Link></td>
                  <td>{(l.productos as unknown as { nombre: string } | null)?.nombre}</td>
                  <td className="text-ink-soft">{(l.maquiladores as unknown as { nombre: string } | null)?.nombre ?? "—"}</td>
                  <td>{fecha(l.fecha_produccion)}</td>
                  <td>{fecha(l.fecha_caducidad) || "—"}</td>
                  <td className="text-right">{num(l.bolsas_finales)}</td>
                  <td className="text-right">{money(l.costo_total)}</td>
                  <td className="text-right font-medium">{money(l.costo_unitario)}</td>
                  <td><Badge color={colorEstado[l.estado as keyof typeof colorEstado]}>{ESTADOS_LOTE[l.estado]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
