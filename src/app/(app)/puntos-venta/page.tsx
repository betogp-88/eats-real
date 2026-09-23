import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Empty, WhatsApp, Chip, Stat } from "@/components/ui";
import { money, fecha, diasTexto, MODALIDADES, num } from "@/lib/utils";
import { empresa } from "@/lib/empresa";

type Resumen = { pedidos: number; total_vendido: number; ultimo_pedido: string | null; dias_entre_pedidos: number | null; dias_sin_pedir: number | null; inventario: number };
type Fila = { id: string; nombre: string; contacto: string | null; telefono: string | null; modalidad: string; zona: string | null; activo: boolean; puntos_venta_resumen: Resumen | null };
const tocaVisitar = (r: Resumen | null) => r?.dias_entre_pedidos != null && r.dias_sin_pedir != null && r.dias_sin_pedir > r.dias_entre_pedidos;

export default async function PuntosVentaPage({ searchParams }: PageProps<"/puntos-venta">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const zona = typeof sp.zona === "string" ? sp.zona : "";
  const f = typeof sp.f === "string" ? sp.f : "activos";
  const supabase = await createClient();
  let query = supabase.from("puntos_venta").select("id, nombre, contacto, telefono, modalidad, zona, activo, puntos_venta_resumen(pedidos, total_vendido, ultimo_pedido, dias_entre_pedidos, dias_sin_pedir, inventario)").order("nombre").limit(1000);
  if (q) query = query.or(`nombre.ilike.%${q}%,contacto.ilike.%${q}%,telefono.ilike.%${q}%,direccion.ilike.%${q}%`);
  if (zona) query = query.eq("zona", zona);
  const { data } = await query;
  const todas = (data ?? []) as unknown as Fila[];
  const zonas = [...new Set(todas.map((p) => p.zona).filter(Boolean) as string[])].sort();

  let filas = todas;
  if (f === "activos") filas = filas.filter((p) => p.activo);
  if (f === "visitar") filas = filas.filter((p) => p.activo && tocaVisitar(p.puntos_venta_resumen));
  if (f === "consignacion") filas = filas.filter((p) => p.activo && p.modalidad === "consignacion");
  if (f === "sinpedidos") filas = filas.filter((p) => p.activo && !p.puntos_venta_resumen?.pedidos);
  if (f === "inactivos") filas = filas.filter((p) => !p.activo);
  if (f === "visitar") filas.sort((a, b) => (b.puntos_venta_resumen?.dias_sin_pedir ?? 0) - (a.puntos_venta_resumen?.dias_sin_pedir ?? 0));

  const activos = todas.filter((p) => p.activo);
  const porVisitar = activos.filter((p) => tocaVisitar(p.puntos_venta_resumen)).length;
  const invTiendas = activos.reduce((s, p) => s + (p.puntos_venta_resumen?.inventario ?? 0), 0);
  const link = (patch: Record<string, string>) => `/puntos-venta?${new URLSearchParams(Object.fromEntries(Object.entries({ q, zona, f, ...patch }).filter(([, v]) => v)))}`;

  return (
    <>
      <PageHeader title="Puntos de venta" subtitle={`Tiendas que venden ${empresa.nombre}, a consignación o compra directa`} actions={<LinkButton href="/puntos-venta/nuevo">Nuevo punto de venta</LinkButton>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Activos" value={num(activos.length)} hint={`${zonas.length} zonas`} />
        <Stat label="Toca visitar" value={num(porVisitar)} hint="pasaron su ritmo de pedido" color={porVisitar ? "red" : "brand"} />
        <Stat label="Inventario en tiendas" value={num(invTiendas)} hint="bolsas a consignación" />
        <Stat label="Vendido total" value={money(activos.reduce((s, p) => s + Number(p.puntos_venta_resumen?.total_vendido ?? 0), 0))} color="ink" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <form className="flex gap-2">{zona && <input type="hidden" name="zona" value={zona} />}<input type="hidden" name="f" value={f} /><input name="q" defaultValue={q} placeholder="Buscar tienda, contacto o teléfono" className="w-64" /><button className="rounded-lg bg-white border border-line px-3 text-sm">Buscar</button></form>
        <span className="hidden sm:block w-px h-6 bg-line mx-1" />
        <Chip href={link({ f: "activos" })} active={f === "activos"}>Activos</Chip>
        <Chip href={link({ f: "visitar" })} active={f === "visitar"}>Toca visitar</Chip>
        <Chip href={link({ f: "consignacion" })} active={f === "consignacion"}>A consignación</Chip>
        <Chip href={link({ f: "sinpedidos" })} active={f === "sinpedidos"}>Sin pedidos</Chip>
        <Chip href={link({ f: "inactivos" })} active={f === "inactivos"}>Inactivos</Chip>
        {zonas.length > 0 && (
          <form className="ml-auto flex items-center gap-2 text-sm">
            <input type="hidden" name="f" value={f} />{q && <input type="hidden" name="q" value={q} />}
            <select name="zona" defaultValue={zona} className="w-auto"><option value="">Todas las zonas</option>{zonas.map((z) => <option key={z}>{z}</option>)}</select>
            <button className="rounded-lg bg-white border border-line px-3 py-2 text-sm">Filtrar</button>
          </form>
        )}
      </div>
      <Card padded={false}>
        {!filas.length ? <Empty action={!todas.length && <LinkButton href="/puntos-venta/nuevo" variant="secondary">Agregar el primero</LinkButton>}>{todas.length ? "Ningún punto de venta con ese filtro." : "Aún no hay puntos de venta."}</Empty> : (
          <>
            <p className="px-4 py-2 text-xs text-ink-soft border-b border-line">{filas.length} de {todas.length}</p>
            <table>
              <thead><tr><th>Tienda</th><th>Zona</th><th>Modalidad</th><th>Último pedido</th><th>Frecuencia</th><th className="text-right">Inv. ahí</th><th className="text-right">Vendido</th><th></th></tr></thead>
              <tbody>
                {filas.map((p) => (
                  <tr key={p.id} className={!p.activo ? "opacity-50" : ""}>
                    <td><Link href={`/puntos-venta/${p.id}`} className="font-medium text-brand hover:underline">{p.nombre}</Link>{p.contacto && <p className="text-xs text-ink-soft">{p.contacto}</p>}</td>
                    <td className="text-ink-soft">{p.zona ?? "—"}</td>
                    <td><Badge color={p.modalidad === "consignacion" ? "orange" : "green"}>{MODALIDADES[p.modalidad]}</Badge></td>
                    <td>{p.puntos_venta_resumen?.ultimo_pedido ? `${fecha(p.puntos_venta_resumen.ultimo_pedido)} · ${diasTexto(p.puntos_venta_resumen.dias_sin_pedir)}` : "—"} {tocaVisitar(p.puntos_venta_resumen) && <Badge color="red">Toca visitar</Badge>}</td>
                    <td className="text-ink-soft">{p.puntos_venta_resumen?.dias_entre_pedidos != null ? `Cada ${p.puntos_venta_resumen.dias_entre_pedidos} días` : "—"}</td>
                    <td className="text-right">{p.modalidad === "consignacion" ? num(p.puntos_venta_resumen?.inventario ?? 0) : "—"}</td>
                    <td className="text-right">{money(p.puntos_venta_resumen?.total_vendido)}</td>
                    <td className="text-right"><WhatsApp telefono={p.telefono} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </>
  );
}
