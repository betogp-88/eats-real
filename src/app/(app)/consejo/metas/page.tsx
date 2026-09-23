import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Empty, Chip, Panel } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { empresa } from "@/lib/empresa";
import { formatoUnidad, nombreMes, type Meta } from "@/lib/consejo";
import { MetaForm } from "./forms";
import { eliminarMeta } from "../actions";

export default async function MetasPage({ searchParams }: PageProps<"/consejo/metas">) {
  const sp = await searchParams;
  const anio = typeof sp.anio === "string" && /^\d{4}$/.test(sp.anio) ? Number(sp.anio) : new Date().getFullYear();
  const supabase = await createClient();
  const [{ data: metas }, { data: avances }, { data: miembros }] = await Promise.all([
    supabase.from("metas").select("*").eq("anio", anio).order("orden").order("creado_en"),
    supabase.from("metas_avances").select("meta_id, mes, valor, nota").order("mes"),
    supabase.schema("public").from("membresias").select("perfiles(id, nombre, email)").eq("empresa", empresa.slug),
  ]);
  const perfiles = ((miembros ?? []) as unknown as { perfiles: { id: string; nombre: string | null; email: string } | null }[]).filter((m) => m.perfiles).map((m) => ({ id: m.perfiles!.id, nombre: m.perfiles!.nombre || m.perfiles!.email.split("@")[0] }));
  const hayVentas = (metas ?? []).some((m) => m.tipo === "ventas");

  return (
    <>
      <PageHeader title={`Metas ${anio}`} subtitle="La meta de ventas se mide sola; las demás se actualizan en cada junta" back={{ href: `/consejo?anio=${anio}`, label: "Consejo" }} actions={<><Chip href={`/consejo/metas?anio=${anio - 1}`} active={false}>{anio - 1}</Chip><Chip href={`/consejo/metas?anio=${anio}`} active>{anio}</Chip><Chip href={`/consejo/metas?anio=${anio + 1}`} active={false}>{anio + 1}</Chip></>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {!metas?.length && <Card><Empty>Sin metas para {anio}. Empieza por la meta de ventas.</Empty></Card>}
          {(metas as Meta[] | null)?.map((m) => {
            const av = (avances ?? []).filter((a) => a.meta_id === m.id);
            return (
              <Panel key={m.id} title={`${m.nombre} · ${formatoUnidad(Number(m.valor_meta), m.unidad)}`}>
                <div className="flex justify-between items-center mb-3">
                  <Badge color={m.tipo === "ventas" ? "green" : "gray"}>{m.tipo === "ventas" ? "Del sistema" : "Manual"}</Badge>
                  <ConfirmButton action={async () => { "use server"; return eliminarMeta(m.id); }} confirmText="¿Eliminar esta meta y sus avances?">Eliminar</ConfirmButton>
                </div>
                <MetaForm meta={m} anio={anio} perfiles={perfiles} hayVentas={hayVentas} />
                {m.tipo === "manual" && av.length > 0 && (
                  <table className="mt-4"><thead><tr><th>Mes</th><th className="text-right">Avance acumulado</th><th>Nota</th></tr></thead>
                    <tbody>{av.map((a) => <tr key={a.mes}><td>{nombreMes(String(a.mes).slice(0, 7))}</td><td className="text-right">{formatoUnidad(Number(a.valor), m.unidad)}</td><td className="text-ink-soft">{a.nota}</td></tr>)}</tbody></table>
                )}
              </Panel>
            );
          })}
        </div>
        <Card title="Nueva meta"><MetaForm anio={anio} perfiles={perfiles} hayVentas={hayVentas} /></Card>
      </div>
    </>
  );
}
