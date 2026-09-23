import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Empty, LinkButton, Stat, Chip } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { money, fecha } from "@/lib/utils";
import { empresa } from "@/lib/empresa";
import { ventasPorMes, progresoMeta, formatoUnidad, nombreMes, MESES_NOMBRES, type Meta, type Avance } from "@/lib/consejo";
import { BarrasVsMeta, Progreso } from "@/components/graficas";
import { prepararJunta, estadoCompromiso } from "./actions";

export default async function ConsejoPage({ searchParams }: PageProps<"/consejo">) {
  const sp = await searchParams;
  const hoy = new Date();
  const anio = typeof sp.anio === "string" && /^\d{4}$/.test(sp.anio) ? Number(sp.anio) : hoy.getFullYear();
  const supabase = await createClient();
  const [{ data: metas }, { data: avances }, ventas, { data: juntas }, { data: compromisos }, { data: miembros }] = await Promise.all([
    supabase.from("metas").select("*").eq("anio", anio).order("orden").order("creado_en"),
    supabase.from("metas_avances").select("meta_id, mes, valor, nota").gte("mes", `${anio}-01-01`).lte("mes", `${anio}-12-31`),
    ventasPorMes(supabase, anio),
    supabase.from("juntas").select("id, mes, fecha, estado, asistentes").gte("mes", `${anio}-01-01`).lte("mes", `${anio}-12-31`).order("mes"),
    supabase.from("compromisos").select("id, descripcion, area, fecha_limite, responsable_id, junta_id, juntas(mes)").eq("estado", "pendiente").order("fecha_limite", { ascending: true, nullsFirst: false }).limit(50),
    supabase.schema("public").from("membresias").select("perfiles(id, nombre, email)").eq("empresa", empresa.slug),
  ]);
  const perfiles = new Map(((miembros ?? []) as unknown as { perfiles: { id: string; nombre: string | null; email: string } | null }[]).filter((m) => m.perfiles).map((m) => [m.perfiles!.id, m.perfiles!.nombre || m.perfiles!.email.split("@")[0]]));
  const metaVentas = (metas ?? []).find((m) => m.tipo === "ventas") as Meta | undefined;
  const juntasPorMes = new Map((juntas ?? []).map((j) => [String(j.mes).slice(0, 7), j]));
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const acumulado = ventas.reduce((s, v) => s + v, 0);
  const hoyStr = hoy.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Consejo" subtitle={`Metas del año, juntas mensuales y compromisos de ${empresa.nombre}`} actions={<><Chip href={`/consejo?anio=${anio - 1}`} active={false}>{anio - 1}</Chip><Chip href={`/consejo?anio=${anio}`} active>{anio}</Chip><Chip href={`/consejo?anio=${anio + 1}`} active={false}>{anio + 1}</Chip><LinkButton href="/consejo/metas" variant="secondary">Metas</LinkButton></>} />

      {/* Metas */}
      {!metas?.length ? (
        <Card className="mb-4"><Empty action={<LinkButton href={`/consejo/metas?anio=${anio}`} variant="accent">Definir metas {anio}</LinkButton>}>Aún no hay metas para {anio}. Define la meta de ventas y las demás metas del año.</Empty></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          {(metas as Meta[]).map((m) => {
            const p = progresoMeta(m, (avances ?? []) as Avance[], ventas, hoy);
            const esperadoPct = Number(m.valor_meta) > 0 ? p.esperado / Number(m.valor_meta) : 0;
            const color = p.ritmo >= 0.95 ? "green" : p.ritmo >= 0.75 ? "orange" : "red";
            return (
              <div key={m.id} className={`rounded-xl bg-card border border-line shadow-sm p-5 ${m.tipo === "ventas" ? "md:col-span-2 xl:col-span-1" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div><p className="text-xs uppercase tracking-wide text-ink-soft">{m.tipo === "ventas" ? "Meta de ventas (del sistema)" : "Meta"}</p><p className="font-semibold text-ink leading-tight">{m.nombre}</p></div>
                  <Badge color={color}>{p.mesesTranscurridos === 0 ? "Sin iniciar" : `${Math.round(p.ritmo * 100)}% del ritmo`}</Badge>
                </div>
                <p className="text-3xl font-bold text-brand">{formatoUnidad(p.actual, m.unidad)}</p>
                <p className="text-sm text-ink-soft mb-3">de {formatoUnidad(Number(m.valor_meta), m.unidad)} · {Math.round(p.pct * 100)}%{p.esperado > 0 && <> · esperado a la fecha {formatoUnidad(p.esperado, m.unidad)}</>}</p>
                <Progreso pct={p.pct} ritmo={p.ritmo} esperadoPct={esperadoPct} />
                <p className="text-xs text-ink-soft mt-2">{m.tipo === "ventas" ? "Ventas netas acumuladas del año" : p.ultimoMes ? `Último avance: ${nombreMes(p.ultimoMes)}` : "Sin avances capturados; se actualizan en cada junta"}{m.responsable_id && perfiles.get(m.responsable_id) ? ` · ${perfiles.get(m.responsable_id)}` : ""}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card title={`Ventas ${anio} contra la meta`} className="lg:col-span-2" actions={<span className="text-sm text-ink-soft">Acumulado <strong className="text-ink">{money(acumulado, 0)}</strong>{metaVentas ? <> de {money(metaVentas.valor_meta, 0)}</> : null}</span>}>
          <BarrasVsMeta valores={ventas} meta={metaVentas ? Number(metaVentas.valor_meta) : undefined} etiquetas={MESES_NOMBRES.map((m) => m.slice(0, 3))} resaltar={anio === hoy.getFullYear() ? hoy.getMonth() : undefined} />
          {!metaVentas && <p className="text-xs text-ink-soft mt-2">Define una meta de tipo «ventas» para ver la línea de referencia.</p>}
        </Card>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <Stat label="Juntas celebradas" value={`${(juntas ?? []).filter((j) => j.estado === "cerrada").length} / 12`} hint={`${(juntas ?? []).filter((j) => j.estado === "borrador").length} en borrador`} />
          <Stat label="Compromisos abiertos" value={String((compromisos ?? []).length)} hint={`${(compromisos ?? []).filter((c) => c.fecha_limite && c.fecha_limite < hoyStr).length} vencidos`} color={(compromisos ?? []).some((c) => c.fecha_limite && c.fecha_limite < hoyStr) ? "red" : "ink"} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`Juntas ${anio}`} padded={false}>
          <ul>
            {MESES_NOMBRES.map((nombre, i) => {
              const mes = `${anio}-${String(i + 1).padStart(2, "0")}`;
              const j = juntasPorMes.get(mes);
              const futuro = mes > mesActual;
              return (
                <li key={mes} className="flex items-center gap-3 px-4 py-2.5 border-b border-line/60 last:border-b-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${j?.estado === "cerrada" ? "bg-brand" : j ? "bg-accent" : futuro ? "bg-line" : "bg-red-300"}`} />
                  <span className={`flex-1 ${futuro ? "text-ink-soft" : ""}`}>{nombre}</span>
                  {j ? (
                    <><span className="text-xs text-ink-soft">{j.fecha ? fecha(j.fecha) : "sin fecha"}</span><Badge color={j.estado === "cerrada" ? "green" : "orange"}>{j.estado === "cerrada" ? "Cerrada" : "Borrador"}</Badge><Link href={`/consejo/juntas/${j.id}`} className="text-sm text-brand hover:underline">Abrir</Link></>
                  ) : futuro ? <span className="text-xs text-ink-soft">—</span> : (
                    <ActionForm action={prepararJunta} submit="Preparar" variant="secondary" className="[&>div]:mt-0"><input type="hidden" name="mes" value={mes} /></ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Compromisos abiertos" padded={false}>
          {!compromisos?.length ? <Empty>Sin compromisos pendientes.</Empty> : (
            <ul>
              {compromisos.map((c) => {
                const vencido = c.fecha_limite && c.fecha_limite < hoyStr;
                const jm = (c.juntas as unknown as { mes: string } | null)?.mes;
                return (
                  <li key={c.id} className="flex gap-3 px-4 py-3 border-b border-line/60 last:border-b-0">
                    <ConfirmButton action={async () => { "use server"; return estadoCompromiso(c.id, "hecho"); }} confirmText="¿Marcar como cumplido?" variant="ghost" className="!p-0 w-6 h-6 rounded-full border-2 border-line hover:border-brand shrink-0 mt-0.5"> </ConfirmButton>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{c.descripcion}</p>
                      <p className="text-xs text-ink-soft">{[c.area, c.responsable_id ? perfiles.get(c.responsable_id) : null, jm ? `junta de ${nombreMes(String(jm).slice(0, 7))}` : null].filter(Boolean).join(" · ")}{c.fecha_limite && <> · <span className={vencido ? "text-red-600 font-medium" : ""}>{vencido ? "venció " : "para "}{fecha(c.fecha_limite)}</span></>}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
