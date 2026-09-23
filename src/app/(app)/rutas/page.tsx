import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Empty, LinkButton } from "@/components/ui";
import { fecha } from "@/lib/utils";
import { DIAS } from "@/lib/utils";
import { empresa } from "@/lib/empresa";
import { RutaForm } from "./form";

export default async function RutasPage() {
  const supabase = await createClient();
  const hoyDia = new Date().getDay();
  const [{ data: rutas }, { data: miembros }] = await Promise.all([
    supabase.from("rutas").select("*, rutas_resumen(tiendas, visitadas_hoy, ultima_salida)").order("dia_semana", { nullsFirst: false }).order("nombre"),
    supabase.schema("public").from("membresias").select("user_id, perfiles(id, nombre, email)").eq("empresa", empresa.slug),
  ]);
  type R = NonNullable<typeof rutas>[number] & { rutas_resumen: { tiendas: number; visitadas_hoy: number; ultima_salida: string | null } | null };
  const lista = (rutas ?? []) as unknown as R[];
  const perfiles = ((miembros ?? []) as unknown as { perfiles: { id: string; nombre: string | null; email: string } | null }[]).map((m) => m.perfiles!).filter(Boolean);
  const porId = new Map(perfiles.map((p) => [p.id, p]));
  const deHoy = lista.filter((r) => r.activo && r.dia_semana === hoyDia);

  return (
    <>
      <PageHeader title="Rutas" subtitle={`Hoy es ${DIAS[hoyDia].toLowerCase()}${deHoy.length ? `: toca ${deHoy.map((r) => r.nombre).join(", ")}` : ". No hay rutas programadas para hoy."}`} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {!lista.length && <Card><Empty>Aún no hay rutas. Crea la primera a la derecha y luego asígnale tiendas.</Empty></Card>}
          {lista.map((r) => {
            const s = r.rutas_resumen;
            const esHoy = r.activo && r.dia_semana === hoyDia;
            return (
              <Link key={r.id} href={`/rutas/${r.id}`} className={`block rounded-xl bg-card border shadow-sm p-4 hover:border-brand-light transition ${esHoy ? "border-brand" : "border-line"} ${!r.activo ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand text-lg">{r.nombre} {esHoy && <Badge color="orange">Hoy</Badge>}{!r.activo && <Badge>Inactiva</Badge>}</p>
                    <p className="text-sm text-ink-soft">{r.dia_semana != null ? DIAS[r.dia_semana] : "Sin día fijo"}{r.cada_semanas > 1 ? `, cada ${r.cada_semanas} semanas` : ", cada semana"}{r.responsable_id && porId.get(r.responsable_id) ? ` · ${porId.get(r.responsable_id)!.nombre || porId.get(r.responsable_id)!.email.split("@")[0]}` : ""}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p><strong>{s?.tiendas ?? 0}</strong> tiendas</p>
                    <p className="text-ink-soft">{esHoy ? `${s?.visitadas_hoy ?? 0} visitadas hoy` : s?.ultima_salida ? `Última salida ${fecha(s.ultima_salida)}` : "Sin visitas aún"}</p>
                  </div>
                </div>
                {esHoy && (s?.tiendas ?? 0) > 0 && (
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-brand" style={{ width: `${Math.min(100, ((s?.visitadas_hoy ?? 0) / s!.tiendas) * 100)}%` }} /></div>
                )}
              </Link>
            );
          })}
        </div>
        <div className="space-y-4">
          <Card title="Nueva ruta"><RutaForm perfiles={perfiles} /></Card>
          <Card title="Cómo funciona">
            <ol className="list-decimal pl-5 text-sm text-ink-soft space-y-1">
              <li>Crea la ruta con su día y frecuencia.</li>
              <li>Entra a la ruta y agrégale tiendas en el orden en que las visitas.</li>
              <li>El día de la ruta, abre la ruta y ve palomeando cada tienda con «Visitar»: cuentas, cobras, repones y tomas foto.</li>
            </ol>
            <p className="text-sm text-ink-soft mt-3"><LinkButton href="/puntos-venta/importar" variant="secondary">Importar tiendas desde Excel</LinkButton></p>
          </Card>
        </div>
      </div>
    </>
  );
}
