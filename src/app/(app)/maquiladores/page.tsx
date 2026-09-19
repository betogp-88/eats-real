import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Tabs, Field, Empty, Switch } from "@/components/ui";
import { ActionForm } from "@/components/ui/client";
import { crearMaquilador, actualizarMaquilador } from "../lotes/actions";
import { tabsProduccion } from "@/lib/nav";
import { money, num } from "@/lib/utils";

export default async function MaquiladoresPage() {
  const supabase = await createClient();
  const [{ data: maquiladores }, { data: lotes }] = await Promise.all([
    supabase.from("maquiladores").select("*").order("nombre"),
    supabase.from("lotes").select("maquilador_id, bolsas_finales, costo_total").neq("estado", "borrador"),
  ]);
  const stats = new Map<string, { lotes: number; bolsas: number; costo: number }>();
  for (const l of lotes ?? []) {
    if (!l.maquilador_id) continue;
    const s = stats.get(l.maquilador_id) ?? { lotes: 0, bolsas: 0, costo: 0 };
    stats.set(l.maquilador_id, { lotes: s.lotes + 1, bolsas: s.bolsas + l.bolsas_finales, costo: s.costo + Number(l.costo_total) });
  }

  return (
    <>
      <PageHeader title="Producción" subtitle="Quién te maquila y cuánto te ha costado en promedio" />
      <Tabs items={tabsProduccion} current="maquiladores" />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {!maquiladores?.length && <Card><Empty>Aún no hay maquiladores. Agrega el primero a la derecha.</Empty></Card>}
          {maquiladores?.map((m) => {
            const s = stats.get(m.id);
            return (
              <Card key={m.id} title={<span className={!m.activo ? "opacity-50" : ""}>{m.nombre}</span>} actions={s && <span className="text-xs text-ink-soft">{s.lotes} lotes · {num(s.bolsas)} bolsas · promedio {money(s.bolsas ? s.costo / s.bolsas : 0)} por bolsa</span>}>
                <ActionForm action={actualizarMaquilador.bind(null, m.id)} submit="Guardar" variant="secondary" className="text-sm">
                  <div className="grid sm:grid-cols-3 gap-3 items-end">
                    <Field label="Nombre"><input name="nombre" defaultValue={m.nombre} required /></Field>
                    <Field label="Contacto"><input name="contacto" defaultValue={m.contacto ?? ""} placeholder="Nombre, teléfono o correo" /></Field>
                    <Switch name="activo" defaultChecked={m.activo} label="Activo" className="pb-2" />
                  </div>
                </ActionForm>
              </Card>
            );
          })}
        </div>
        <Card title="Nuevo maquilador">
          <ActionForm action={crearMaquilador} submit="Agregar">
            <div className="space-y-3">
              <Field label="Nombre"><input name="nombre" required /></Field>
              <Field label="Contacto"><input name="contacto" placeholder="Nombre, teléfono o correo" /></Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
