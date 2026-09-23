import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Empty, LinkButton, Stat, Panel, Field } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { money, fecha, num, MODALIDADES } from "@/lib/utils";
import { DIAS } from "@/lib/utils";
import { empresa } from "@/lib/empresa";
import { RutaForm } from "../form";
import { guardarOrden, asignarTiendas, quitarDeRuta, toggleRuta } from "../actions";

export default async function RutaPage({ params }: PageProps<"/rutas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: ruta }, { data: tiendas }, { data: sinRuta }, { data: miembros }] = await Promise.all([
    supabase.from("rutas").select("*").eq("id", id).maybeSingle(),
    supabase.from("puntos_venta").select("id, nombre, contacto, telefono, direccion, modalidad, orden, activo, puntos_venta_resumen(inventario, saldo_pendiente, ultima_visita, ultimo_pedido, dias_sin_pedir)").eq("ruta_id", id).order("orden", { nullsFirst: false }).order("nombre"),
    supabase.from("puntos_venta").select("id, nombre").is("ruta_id", null).eq("activo", true).order("nombre").limit(1000),
    supabase.schema("public").from("membresias").select("perfiles(id, nombre, email)").eq("empresa", empresa.slug),
  ]);
  if (!ruta) notFound();
  type T = { id: string; nombre: string; contacto: string | null; telefono: string | null; direccion: string | null; modalidad: string; orden: number | null; activo: boolean; puntos_venta_resumen: { inventario: number; saldo_pendiente: number; ultima_visita: string | null; ultimo_pedido: string | null; dias_sin_pedir: number | null } | null };
  const lista = ((tiendas ?? []) as unknown as T[]).filter((t) => t.activo);
  const { data: vHoy } = lista.length
    ? await supabase.from("visitas").select("id, punto_venta_id, resultado, vendido, cobro_monto").gte("fecha", hoy + "T00:00:00").in("punto_venta_id", lista.map((t) => t.id))
    : { data: [] as { id: string; punto_venta_id: string; resultado: string; vendido: number; cobro_monto: number }[] };
  const visitadas = new Map((vHoy ?? []).map((v) => [v.punto_venta_id, v]));
  const perfiles = ((miembros ?? []) as unknown as { perfiles: { id: string; nombre: string | null; email: string } | null }[]).map((m) => m.perfiles!).filter(Boolean);
  const esHoy = ruta.dia_semana === new Date().getDay();
  const saldoTotal = lista.reduce((s, t) => s + Number(t.puntos_venta_resumen?.saldo_pendiente ?? 0), 0);
  const cobradoHoy = (vHoy ?? []).reduce((s, v) => s + Number(v.cobro_monto), 0);

  return (
    <>
      <PageHeader title={ruta.nombre} subtitle={`${ruta.dia_semana != null ? DIAS[ruta.dia_semana] : "Sin día fijo"}${ruta.cada_semanas > 1 ? `, cada ${ruta.cada_semanas} semanas` : ""}${ruta.notas ? " · " + ruta.notas : ""}`} back={{ href: "/rutas", label: "Rutas" }}
        actions={<>{esHoy && <Badge color="orange">Es hoy</Badge>}<ConfirmButton action={async () => { "use server"; return toggleRuta(id, !ruta.activo); }} confirmText={ruta.activo ? "¿Desactivar la ruta?" : "¿Activar la ruta?"} variant="secondary">{ruta.activo ? "Desactivar" : "Activar"}</ConfirmButton></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Tiendas" value={num(lista.length)} />
        <Stat label="Visitadas hoy" value={`${visitadas.size} / ${lista.length}`} color={visitadas.size === lista.length && lista.length ? "brand" : "ink"} />
        <Stat label="Cobrado hoy" value={money(cobradoHoy)} />
        <Stat label="Saldo por cobrar" value={money(saldoTotal)} hint="pedidos pendientes de pago" color={saldoTotal > 0 ? "red" : "brand"} />
      </div>

      <Card title="Recorrido" className="mb-4" padded={false}>
        {!lista.length ? <Empty>Esta ruta no tiene tiendas. Agrégalas abajo.</Empty> : (
          <ul>
            {lista.map((t, i) => {
              const v = visitadas.get(t.id);
              const r = t.puntos_venta_resumen;
              return (
                <li key={t.id} className={`flex gap-3 px-4 py-3 border-b border-line/60 last:border-b-0 ${v ? "bg-brand-light/10" : ""}`}>
                  <span className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${v ? "bg-brand text-white" : "bg-muted text-ink-soft"}`}>{v ? "✓" : t.orden ?? i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium"><Link href={`/puntos-venta/${t.id}`} className="text-brand hover:underline">{t.nombre}</Link> <span className="text-xs text-ink-soft">{MODALIDADES[t.modalidad]}</span></p>
                    <p className="text-xs text-ink-soft">{[t.direccion, t.contacto, t.telefono].filter(Boolean).join(" · ")}</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {t.modalidad === "consignacion" && <>Tiene <strong>{num(r?.inventario ?? 0)}</strong> bolsas · </>}
                      {r?.ultima_visita ? `Última visita ${fecha(r.ultima_visita)}` : "Nunca visitada"}
                      {Number(r?.saldo_pendiente) > 0 && <> · <span className="text-red-600 font-medium">Debe {money(r!.saldo_pendiente)}</span></>}
                      {v && <> · Hoy: {v.resultado === "venta" ? `vendió ${v.vendido}, cobró ${money(v.cobro_monto)}` : v.resultado.replace("_", " ")}</>}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-1 items-end">
                    <LinkButton href={`/visitas/nueva?pv=${t.id}&ruta=${id}`} variant={v ? "secondary" : "accent"} className="text-xs px-3 py-1.5">{v ? "Otra visita" : "Visitar"}</LinkButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Agregar tiendas a esta ruta">
          {!sinRuta?.length ? <p className="text-sm text-ink-soft">Todas las tiendas activas ya tienen ruta.</p> : (
            <ActionForm action={asignarTiendas.bind(null, id)} submit="Agregar a la ruta" variant="secondary">
              <p className="text-xs text-ink-soft mb-2">Tiendas sin ruta ({sinRuta.length}). Marca las que van aquí:</p>
              <div className="max-h-64 overflow-auto rounded-lg border border-line divide-y divide-line/60">
                {sinRuta.map((t) => <label key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm text-ink mb-0"><input type="checkbox" name="pv_ids" value={t.id} /> {t.nombre}</label>)}
              </div>
            </ActionForm>
          )}
        </Panel>
        <Panel title="Orden de visita y ajustes">
          {lista.length > 0 && (
            <ActionForm action={guardarOrden.bind(null, id)} submit="Guardar orden" variant="secondary" className="mb-6">
              <div className="space-y-1.5">
                {lista.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <input type="number" name={`orden[${t.id}]`} defaultValue={t.orden ?? i + 1} className="w-16 text-center" min={1} />
                    <span className="flex-1 truncate">{t.nombre}</span>
                    <ConfirmButton action={async () => { "use server"; return quitarDeRuta(id, t.id); }} confirmText="¿Quitar esta tienda de la ruta?" variant="ghost">Quitar</ConfirmButton>
                  </div>
                ))}
              </div>
            </ActionForm>
          )}
          <Field label="Datos de la ruta"><span /></Field>
          <RutaForm ruta={ruta} perfiles={perfiles} />
        </Panel>
      </div>
    </>
  );
}
