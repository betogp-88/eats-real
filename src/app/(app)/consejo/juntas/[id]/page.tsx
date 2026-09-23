import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Empty, Stat, Panel } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { money, num, fecha, pct, CANALES } from "@/lib/utils";
import { empresa } from "@/lib/empresa";
import { kpisDelMes, mesAnterior, nombreMes, ventasPorMes, progresoMeta, formatoUnidad, AREAS, type Meta, type Avance } from "@/lib/consejo";
import { Progreso } from "@/components/graficas";
import { MinutaForm, CompromisoForm, AvancesForm, BotonImprimir } from "./forms";
import { cerrarJunta, reabrirJunta, eliminarJunta, estadoCompromiso, eliminarCompromiso } from "../../actions";

function KPI({ label, v, ant, dinero = true, invertir = false }: { label: string; v: number; ant: number; dinero?: boolean; invertir?: boolean }) {
  const d = delta(v, ant);
  const bueno = d ? (invertir ? d.d <= 0 : d.d >= 0) : true;
  return <Stat label={label} value={dinero ? money(v, 0) : num(v)} hint={d?.texto ?? "sin dato anterior"} color={d && !bueno ? "red" : "brand"} />;
}

function delta(actual: number, anterior: number) {
  if (!anterior) return null;
  const d = (actual - anterior) / Math.abs(anterior);
  return { d, texto: `${d >= 0 ? "+" : ""}${(d * 100).toFixed(0)}% vs mes anterior` };
}

export default async function JuntaPage({ params }: PageProps<"/consejo/juntas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: junta } = await supabase.from("juntas").select("*").eq("id", id).maybeSingle();
  if (!junta) notFound();
  const mes = String(junta.mes).slice(0, 7);
  const anio = Number(mes.slice(0, 4));
  const editable = junta.estado === "borrador";
  const [k, kAnt, { data: metas }, { data: avances }, ventas, { data: compromisos }, { data: miembros }] = await Promise.all([
    kpisDelMes(supabase, mes),
    kpisDelMes(supabase, mesAnterior(mes)),
    supabase.from("metas").select("*").eq("anio", anio).order("orden"),
    supabase.from("metas_avances").select("meta_id, mes, valor, nota").gte("mes", `${anio}-01-01`).lte("mes", `${anio}-12-31`),
    ventasPorMes(supabase, anio),
    supabase.from("compromisos").select("*, juntas(mes)").or(`junta_id.eq.${id},estado.eq.pendiente`).order("estado").order("fecha_limite", { ascending: true, nullsFirst: false }),
    supabase.schema("public").from("membresias").select("perfiles(id, nombre, email)").eq("empresa", empresa.slug),
  ]);
  const perfiles = ((miembros ?? []) as unknown as { perfiles: { id: string; nombre: string | null; email: string } | null }[]).filter((m) => m.perfiles).map((m) => ({ id: m.perfiles!.id, nombre: m.perfiles!.nombre || m.perfiles!.email.split("@")[0] }));
  const nombreDe = (pid: string | null) => perfiles.find((p) => p.id === pid)?.nombre;
  const finMes = new Date(anio, Number(mes.slice(5, 7)), 0);
  const metasM = (metas ?? []) as Meta[];
  const avancesMes: Record<string, { valor: number; nota: string | null }> = {};
  for (const a of (avances ?? []) as Avance[]) if (String(a.mes).slice(0, 7) === mes) avancesMes[a.meta_id] = { valor: Number(a.valor), nota: a.nota };
  const hoyStr = new Date().toISOString().slice(0, 10);
  const deEstaJunta = (compromisos ?? []).filter((c) => c.junta_id === id);
  const arrastrados = (compromisos ?? []).filter((c) => c.junta_id !== id && c.estado === "pendiente");


  return (
    <div className="print:text-sm">
      <PageHeader title={`Junta de consejo · ${nombreMes(mes)}`} subtitle={`${empresa.nombre}${junta.fecha ? " · celebrada el " + fecha(junta.fecha) : ""}${junta.asistentes ? " · " + junta.asistentes : ""}`} back={{ href: `/consejo?anio=${anio}`, label: "Consejo" }}
        actions={<>
          <Badge color={editable ? "orange" : "green"}>{editable ? "Borrador" : "Cerrada"}</Badge>
          <BotonImprimir />
          {editable
            ? <><ConfirmButton action={async () => { "use server"; return cerrarJunta(id); }} confirmText="Al cerrar la junta la minuta queda fija. ¿Cerrar?" variant="accent">Cerrar junta</ConfirmButton><ConfirmButton action={async () => { "use server"; return eliminarJunta(id); }} confirmText="¿Eliminar esta junta en borrador?">Eliminar</ConfirmButton></>
            : <ConfirmButton action={async () => { "use server"; return reabrirJunta(id); }} confirmText="¿Reabrir la junta para editar?" variant="secondary">Reabrir</ConfirmButton>}
        </>} />

      <h2 className="font-semibold text-ink mb-2">Números del mes <span className="text-ink-soft font-normal text-sm">(automáticos del sistema)</span></h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <KPI label="Ventas netas" v={k.ventas_netas} ant={kAnt.ventas_netas} />
        <KPI label="Utilidad bruta" v={k.utilidad_bruta} ant={kAnt.utilidad_bruta} />
        <KPI label="Gastos operativos" v={k.gastos} ant={kAnt.gastos} invertir />
        <KPI label="Marketing" v={k.marketing} ant={kAnt.marketing} invertir />
        <KPI label="Utilidad operativa" v={k.utilidad_operativa} ant={kAnt.utilidad_operativa} />
        <KPI label="Pedidos" v={k.pedidos} ant={kAnt.pedidos} dinero={false} />
        <KPI label="Bolsas vendidas" v={k.bolsas} ant={kAnt.bolsas} dinero={false} />
        <Stat label="Margen bruto" value={pct(k.utilidad_bruta, k.ventas_netas)} hint={`mes anterior ${pct(kAnt.utilidad_bruta, kAnt.ventas_netas)}`} color="ink" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="Clientes nuevos" v={k.clientes_nuevos} ant={kAnt.clientes_nuevos} dinero={false} />
        <Stat label="Puntos de venta activos" value={num(k.tiendas_activas)} color="ink" />
        <KPI label="Visitas a tiendas" v={k.visitas} ant={kAnt.visitas} dinero={false} />
        <Stat label="Saldo por cobrar" value={money(k.saldo_por_cobrar, 0)} hint="hoy, en tiendas" color={k.saldo_por_cobrar > 0 ? "red" : "brand"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card title="Ventas por canal">
          {!Object.keys(k.por_canal).length ? <Empty>Sin ventas en el mes.</Empty> : (
            <table><tbody>{Object.entries(k.por_canal).sort((a, b) => b[1] - a[1]).map(([c, v]) => {
              const ant = kAnt.por_canal[c] ?? 0; const d = delta(v, ant);
              return <tr key={c}><td>{CANALES[c] ?? c}</td><td className="text-right font-medium">{money(v, 0)}</td><td className="text-right text-xs text-ink-soft">{pct(v, k.ventas_netas)}</td><td className={`text-right text-xs ${d && d.d < 0 ? "text-red-600" : "text-ink-soft"}`}>{d ? `${d.d >= 0 ? "+" : ""}${(d.d * 100).toFixed(0)}%` : "nuevo"}</td></tr>;
            })}</tbody></table>
          )}
        </Card>
        <Card title="Metas del año" className="lg:col-span-2">
          {!metasM.length ? <Empty>Sin metas definidas para {anio}.</Empty> : (
            <div className="space-y-3">
              {metasM.map((m) => {
                const p = progresoMeta(m, (avances ?? []) as Avance[], ventas, finMes < new Date() ? finMes : new Date());
                return (
                  <div key={m.id}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-medium">{m.nombre}</span><span className="text-ink-soft">{formatoUnidad(p.actual, m.unidad)} de {formatoUnidad(Number(m.valor_meta), m.unidad)} · {Math.round(p.pct * 100)}%</span></div>
                    <Progreso pct={p.pct} ritmo={p.ritmo} esperadoPct={Number(m.valor_meta) > 0 ? p.esperado / Number(m.valor_meta) : 0} />
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-line print:hidden">
            <p className="text-sm font-medium mb-2">Actualizar avance de metas manuales al cierre de {nombreMes(mes)}</p>
            <AvancesForm mes={mes} juntaId={id} metas={metasM.filter((m) => m.tipo === "manual")} valores={avancesMes} editable={editable} />
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Minuta por área" className="lg:col-span-2">
          {editable ? <MinutaForm junta={{ id, fecha: junta.fecha, asistentes: junta.asistentes, acuerdos: junta.acuerdos, minuta: (junta.minuta ?? {}) as Record<string, string> }} editable /> : (
            <div className="space-y-4">
              {AREAS.map((a) => { const t = (junta.minuta as Record<string, string>)?.[a.key]; return t ? <div key={a.key}><p className="font-semibold text-brand">{a.label}</p><p className="text-sm whitespace-pre-line">{t}</p></div> : null; })}
              {junta.acuerdos && <div><p className="font-semibold text-brand">Acuerdos</p><p className="text-sm whitespace-pre-line">{junta.acuerdos}</p></div>}
              {!AREAS.some((a) => (junta.minuta as Record<string, string>)?.[a.key]) && <Empty>Esta junta se cerró sin minuta.</Empty>}
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card title={`Compromisos de esta junta (${deEstaJunta.length})`} padded={false}>
            {!deEstaJunta.length ? <Empty>Aún no hay compromisos.</Empty> : (
              <ul>{deEstaJunta.map((c) => (
                <li key={c.id} className="flex gap-2 px-4 py-2.5 border-b border-line/60 last:border-b-0">
                  <ConfirmButton action={async () => { "use server"; return estadoCompromiso(c.id, c.estado === "hecho" ? "pendiente" : "hecho", id); }} confirmText={c.estado === "hecho" ? "¿Reabrir?" : "¿Marcar como cumplido?"} variant="ghost" className={`!p-0 w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 text-[10px] ${c.estado === "hecho" ? "bg-brand border-brand text-white" : "border-line"}`}>{c.estado === "hecho" ? "✓" : " "}</ConfirmButton>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${c.estado !== "pendiente" ? "line-through text-ink-soft" : ""}`}>{c.descripcion}</p>
                    <p className="text-xs text-ink-soft">{[c.area, nombreDe(c.responsable_id)].filter(Boolean).join(" · ")}{c.fecha_limite && <> · <span className={c.estado === "pendiente" && c.fecha_limite < hoyStr ? "text-red-600" : ""}>{fecha(c.fecha_limite)}</span></>}</p>
                  </div>
                  {editable && <ConfirmButton action={async () => { "use server"; return eliminarCompromiso(c.id, id); }} confirmText="¿Eliminar?" variant="ghost" className="!px-1 !py-0 text-xs print:hidden">×</ConfirmButton>}
                </li>
              ))}</ul>
            )}
          </Card>
          {editable && <Panel title="Nuevo compromiso" open><CompromisoForm juntaId={id} perfiles={perfiles} /></Panel>}
          <Card title={`Pendientes de juntas anteriores (${arrastrados.length})`} padded={false}>
            {!arrastrados.length ? <Empty>Nada arrastrado. Bien.</Empty> : (
              <ul>{arrastrados.map((c) => {
                const jm = (c.juntas as unknown as { mes: string } | null)?.mes;
                return (
                  <li key={c.id} className="flex gap-2 px-4 py-2.5 border-b border-line/60 last:border-b-0">
                    <ConfirmButton action={async () => { "use server"; return estadoCompromiso(c.id, "hecho", id); }} confirmText="¿Marcar como cumplido?" variant="ghost" className="!p-0 w-5 h-5 rounded-full border-2 border-line shrink-0 mt-0.5"> </ConfirmButton>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{c.descripcion}</p>
                      <p className="text-xs text-ink-soft">{[jm ? `de ${nombreMes(String(jm).slice(0, 7))}` : null, nombreDe(c.responsable_id)].filter(Boolean).join(" · ")}{c.fecha_limite && <> · <span className={c.fecha_limite < hoyStr ? "text-red-600 font-medium" : ""}>{c.fecha_limite < hoyStr ? "venció " : ""}{fecha(c.fecha_limite)}</span></>}</p>
                    </div>
                  </li>
                );
              })}</ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
