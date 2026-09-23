import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat, Card, Empty, Badge, LinkButton, WhatsApp } from "@/components/ui";
import { money, num, fecha, diasTexto, pct, CANALES } from "@/lib/utils";
import { DIAS } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const mes = new Date().toISOString().slice(0, 7) + "-01";
  const [{ data: r }, { data: pendientes }, { data: existencias }, { data: productos }, { data: clientes }, { data: puntos }, { data: tareas }] = await Promise.all([
    supabase.from("resultados_mensuales").select("*").eq("mes", mes).maybeSingle(),
    supabase.from("pedidos").select("id, canal, fecha, ref_externa, cliente_nombre").eq("estado", "pendiente").order("fecha").limit(8),
    supabase.from("existencias").select("producto_id, cantidad, ubicaciones(tipo)"),
    supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("clientes").select("id, nombre, telefono, clientes_resumen(dias_sin_comprar, ultima_compra, pedidos)").limit(200),
    supabase.from("puntos_venta").select("id, nombre, telefono, puntos_venta_resumen(dias_sin_pedir, dias_entre_pedidos, ultimo_pedido)").eq("activo", true).limit(1000),
    supabase.from("tareas").select("id, titulo, prioridad, fecha_limite").eq("asignado_a", user?.id ?? "").eq("estado", "pendiente").order("fecha_limite", { ascending: true, nullsFirst: false }).limit(6),
  ]);
  const { data: rutasHoy } = await supabase.from("rutas").select("id, nombre, rutas_resumen(tiendas, visitadas_hoy)").eq("activo", true).eq("dia_semana", new Date().getDay());

  const ventas = Number(r?.ventas_netas ?? 0);
  const bruta = ventas - Number(r?.costo_venta ?? 0);
  const operativa = bruta - Number(r?.comisiones ?? 0) - Number(r?.costo_envio ?? 0) - Number(r?.marketing ?? 0) - Number(r?.gastos ?? 0);

  const stock = new Map<string, number>();
  for (const e of existencias ?? []) if ((e.ubicaciones as unknown as { tipo: string } | null)?.tipo === "almacen") stock.set(e.producto_id, (stock.get(e.producto_id) ?? 0) + e.cantidad);

  type C = { id: string; nombre: string; telefono: string | null; clientes_resumen: { dias_sin_comprar: number | null; ultima_compra: string | null; pedidos: number } | null };
  const contactar = ((clientes ?? []) as unknown as C[]).filter((c) => c.clientes_resumen?.dias_sin_comprar != null && c.clientes_resumen.dias_sin_comprar > 30).sort((a, b) => b.clientes_resumen!.dias_sin_comprar! - a.clientes_resumen!.dias_sin_comprar!).slice(0, 6);
  type P = { id: string; nombre: string; telefono: string | null; puntos_venta_resumen: { dias_sin_pedir: number | null; dias_entre_pedidos: number | null; ultimo_pedido: string | null } | null };
  const visitarTodos = ((puntos ?? []) as unknown as P[]).filter((p) => { const s = p.puntos_venta_resumen; return s?.dias_entre_pedidos != null && s.dias_sin_pedir != null && s.dias_sin_pedir > s.dias_entre_pedidos; }).sort((a, b) => (b.puntos_venta_resumen!.dias_sin_pedir ?? 0) - (a.puntos_venta_resumen!.dias_sin_pedir ?? 0));
  const visitar = visitarTodos.slice(0, 8);

  return (
    <>
      <PageHeader title="Inicio" subtitle="Lo que hay que hacer hoy y cómo va el mes"
        actions={<><LinkButton href="/pedidos/nuevo" variant="accent">Nuevo pedido</LinkButton><LinkButton href="/lotes/nuevo" variant="secondary">Nuevo lote</LinkButton><LinkButton href="/clientes/nuevo" variant="secondary">Nuevo cliente</LinkButton></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Ventas del mes" value={money(ventas)} />
        <Stat label="Utilidad bruta" value={money(bruta)} hint={`${pct(bruta, ventas)} de margen`} />
        <Stat label="Utilidad operativa" value={money(operativa)} color={operativa < 0 ? "red" : "brand"} />
        <Stat label="Por despachar" value={String(pendientes?.length ?? 0)} hint="pedidos pendientes" color="ink" />
      </div>
      {(rutasHoy ?? []).length > 0 && (
        <div className="mb-4 rounded-xl border border-brand bg-brand-light/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-brand">Ruta de hoy, {DIAS[new Date().getDay()].toLowerCase()}</p>
            <p className="text-sm text-ink-soft">{(rutasHoy ?? []).map((r) => { const s = r.rutas_resumen as unknown as { tiendas: number; visitadas_hoy: number } | null; return `${r.nombre}: ${s?.visitadas_hoy ?? 0} de ${s?.tiendas ?? 0} tiendas visitadas`; }).join(" · ")}</p>
          </div>
          <div className="flex gap-2">{(rutasHoy ?? []).map((r) => <LinkButton key={r.id} href={`/rutas/${r.id}`} variant="accent">Abrir {r.nombre}</LinkButton>)}</div>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Mis tareas" actions={<Link href="/tareas" className="text-sm text-brand hover:underline">Ver todas</Link>} padded={false}>
          {!tareas?.length ? <Empty>Sin pendientes asignados a ti.</Empty> : (
            <table><tbody>{tareas.map((t) => (
              <tr key={t.id}><td><Link href="/tareas" className="text-brand hover:underline font-medium">{t.titulo}</Link></td><td className="text-right"><Badge color={t.prioridad === "alta" ? "red" : t.prioridad === "media" ? "orange" : "gray"}>{t.prioridad}</Badge></td><td className="text-right text-ink-soft w-28">{t.fecha_limite ? fecha(t.fecha_limite) : ""}</td></tr>
            ))}</tbody></table>
          )}
        </Card>
        <Card title="Pedidos por despachar" actions={<Link href="/pedidos?estado=pendiente" className="text-sm text-brand hover:underline">Ver todos</Link>} padded={false}>
          {!pendientes?.length ? <Empty>Todo despachado.</Empty> : (
            <table><tbody>{pendientes.map((p) => (
              <tr key={p.id}><td className="whitespace-nowrap">{fecha(p.fecha)}</td><td>{p.cliente_nombre ?? "—"}</td><td><Badge color="green">{CANALES[p.canal]}</Badge></td><td className="text-right"><Link href={`/pedidos/${p.id}`} className="text-brand hover:underline font-medium">Despachar</Link></td></tr>
            ))}</tbody></table>
          )}
        </Card>
        <Card title="Inventario en almacén" actions={<Link href="/inventario" className="text-sm text-brand hover:underline">Detalle</Link>} padded={false}>
          <table><tbody>{(productos ?? []).map((p) => { const q = stock.get(p.id) ?? 0; return (
            <tr key={p.id}><td>{p.nombre}</td><td className="text-right font-medium">{num(q)} <span className="text-ink-soft font-normal">bolsas</span></td><td className="text-right w-24">{q === 0 ? <Badge color="red">Sin stock</Badge> : q < 50 ? <Badge color="orange">Bajo</Badge> : null}</td></tr>
          ); })}</tbody></table>
        </Card>
        <Card title="Clientes a los que conviene escribir" actions={<Link href="/clientes?f=riesgo" className="text-sm text-brand hover:underline">Ver lista</Link>} padded={false}>
          {!contactar.length ? <Empty>Nadie lleva más de 30 días sin comprar.</Empty> : (
            <table><tbody>{contactar.map((c) => (
              <tr key={c.id}><td><Link href={`/clientes/${c.id}`} className="text-brand hover:underline font-medium">{c.nombre}</Link></td><td className="text-ink-soft">{diasTexto(c.clientes_resumen!.dias_sin_comprar)} · {c.clientes_resumen!.pedidos} pedidos</td><td className="text-right"><WhatsApp telefono={c.telefono} /></td></tr>
            ))}</tbody></table>
          )}
        </Card>
        <Card title={`Puntos de venta que toca visitar${visitarTodos.length > 8 ? ` (${visitarTodos.length})` : ""}`} actions={<Link href="/puntos-venta?f=visitar" className="text-sm text-brand hover:underline">Ver todos</Link>} padded={false}>
          {!visitar.length ? <Empty>Ninguna tienda se ha pasado de su ritmo habitual de pedido.</Empty> : (
            <table><tbody>{visitar.map((p) => (
              <tr key={p.id}><td><Link href={`/puntos-venta/${p.id}`} className="text-brand hover:underline font-medium">{p.nombre}</Link></td><td className="text-ink-soft">Último pedido {diasTexto(p.puntos_venta_resumen!.dias_sin_pedir)} · suele pedir cada {p.puntos_venta_resumen!.dias_entre_pedidos} días</td><td className="text-right"><WhatsApp telefono={p.telefono} /></td></tr>
            ))}</tbody></table>
          )}
        </Card>
      </div>
    </>
  );
}
