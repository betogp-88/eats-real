import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Empty, Chip, WhatsApp } from "@/components/ui";
import { money, fecha, diasTexto, semaforo } from "@/lib/utils";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filtro = typeof sp.f === "string" ? sp.f : "";
  const supabase = await createClient();
  let query = supabase.from("clientes").select("id, nombre, telefono, email, clientes_resumen(pedidos, total_comprado, ultima_compra, dias_sin_comprar)").limit(300);
  if (q) query = query.or(`nombre.ilike.%${q}%,telefono.ilike.%${q.replace(/\D/g, "") || q}%,email.ilike.%${q}%`);
  const { data } = await query;

  type Fila = { id: string; nombre: string; telefono: string | null; email: string | null; clientes_resumen: { pedidos: number; total_comprado: number; ultima_compra: string | null; dias_sin_comprar: number | null } | null };
  let filas = ((data ?? []) as unknown as Fila[]).map((c) => ({ ...c, r: c.clientes_resumen }));
  if (filtro === "riesgo") filas = filas.filter((c) => c.r?.dias_sin_comprar != null && c.r.dias_sin_comprar > 45);
  if (filtro === "activos") filas = filas.filter((c) => c.r?.dias_sin_comprar != null && c.r.dias_sin_comprar <= 45);
  if (filtro === "nuevos") filas = filas.filter((c) => !c.r?.pedidos);
  filas.sort((a, b) => (b.r?.dias_sin_comprar ?? -1) - (a.r?.dias_sin_comprar ?? -1));

  const link = (f: string) => `/clientes?${new URLSearchParams({ ...(q ? { q } : {}), ...(f ? { f } : {}) })}`;

  return (
    <>
      <PageHeader title="Clientes" subtitle="Ordenados por los que llevan más tiempo sin comprar" actions={<LinkButton href="/clientes/nuevo">Nuevo cliente</LinkButton>} />
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Buscar por nombre, celular o correo" className="w-64" />{filtro && <input type="hidden" name="f" value={filtro} />}<button className="rounded-lg bg-white border border-line px-3 text-sm">Buscar</button></form>
        <Chip href={link("")} active={!filtro}>Todos</Chip>
        <Chip href={link("riesgo")} active={filtro === "riesgo"}>Por contactar</Chip>
        <Chip href={link("activos")} active={filtro === "activos"}>Activos</Chip>
        <Chip href={link("nuevos")} active={filtro === "nuevos"}>Sin compras</Chip>
      </div>
      <Card padded={false}>
        {!filas.length ? <Empty action={<LinkButton href="/clientes/nuevo" variant="secondary">Crear el primero</LinkButton>}>{q ? "No hay clientes con esa búsqueda." : "Aún no hay clientes. Se crean solos al capturar pedidos directos, o puedes darlos de alta aquí."}</Empty> : (
          <table>
            <thead><tr><th>Cliente</th><th>Contacto</th><th>Estado</th><th>Última compra</th><th className="text-right">Pedidos</th><th className="text-right">Total</th><th></th></tr></thead>
            <tbody>
              {filas.map((c) => {
                const s = semaforo(c.r?.dias_sin_comprar);
                return (
                  <tr key={c.id}>
                    <td><Link href={`/clientes/${c.id}`} className="font-medium text-brand hover:underline">{c.nombre}</Link></td>
                    <td className="text-ink-soft text-xs">{c.telefono ?? ""}{c.telefono && c.email ? " · " : ""}{c.email ?? ""}</td>
                    <td><Badge color={s.color}>{s.label}</Badge></td>
                    <td>{c.r?.ultima_compra ? `${fecha(c.r.ultima_compra)} · ${diasTexto(c.r.dias_sin_comprar)}` : "—"}</td>
                    <td className="text-right">{c.r?.pedidos ?? 0}</td>
                    <td className="text-right">{money(c.r?.total_comprado)}</td>
                    <td className="text-right"><WhatsApp telefono={c.telefono} /></td>
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
