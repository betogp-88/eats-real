import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Stat } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { money, num, ESTADOS_LOTE } from "@/lib/utils";
import { LoteForm } from "../form";
import { recibirLote, cerrarLote, eliminarLote } from "../actions";

export default async function LotePage({ params }: PageProps<"/lotes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: productos }, { data: maquiladores }] = await Promise.all([
    supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("maquiladores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (id === "nuevo") {
    return (
      <>
        <PageHeader title="Nuevo lote" subtitle="Producto, bolsas y costos en un solo paso" back={{ href: "/lotes", label: "Producción" }} />
        <Card className="max-w-3xl"><LoteForm productos={productos ?? []} maquiladores={maquiladores ?? []} /></Card>
      </>
    );
  }

  const [{ data: lote }, { data: costos }, { data: existencias }] = await Promise.all([
    supabase.from("lotes").select("*, productos(nombre)").eq("id", id).maybeSingle(),
    supabase.from("lote_costos").select("concepto, monto").eq("lote_id", id).order("concepto"),
    supabase.from("existencias").select("cantidad, ubicaciones(nombre)").eq("lote_id", id),
  ]);
  if (!lote) notFound();
  const producto = (lote.productos as unknown as { nombre: string } | null)?.nombre;
  const enStock = (existencias ?? []).reduce((s, e) => s + e.cantidad, 0);

  return (
    <>
      <PageHeader title={`Lote ${lote.codigo}`} subtitle={producto} back={{ href: "/lotes", label: "Producción" }}
        actions={<>
          <Badge color={lote.estado === "recibido" ? "green" : lote.estado === "cerrado" ? "orange" : "gray"}>{ESTADOS_LOTE[lote.estado]}</Badge>
          {lote.estado === "borrador" && <ConfirmButton action={async () => { "use server"; return recibirLote(id); }} confirmText="¿Dar entrada a inventario con las bolsas finales de este lote?" variant="accent">Ya llegó al almacén</ConfirmButton>}
          {lote.estado === "borrador" && <ConfirmButton action={async () => { "use server"; return eliminarLote(id); }} confirmText="¿Eliminar este lote en borrador?">Eliminar</ConfirmButton>}
          {lote.estado === "recibido" && <ConfirmButton action={async () => { "use server"; return cerrarLote(id); }} confirmText="Al cerrar el lote ya no se podrán editar sus costos. ¿Continuar?" variant="secondary">Cerrar lote</ConfirmButton>}
        </>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Bolsas finales" value={num(lote.bolsas_finales)} />
        <Stat label="Costo total" value={money(lote.costo_total)} />
        <Stat label="Costo por bolsa" value={money(lote.costo_unitario)} hint="Costo total ÷ bolsas finales" />
        <Stat label="En inventario" value={num(enStock)} hint={(existencias ?? []).map((e) => `${(e.ubicaciones as unknown as { nombre: string } | null)?.nombre}: ${e.cantidad}`).join(" · ") || (lote.estado === "borrador" ? "Aún no entra" : "Agotado")} />
      </div>
      <Card className="max-w-3xl" title={lote.estado === "cerrado" ? "Datos del lote (cerrado)" : "Datos y costos"}>
        <LoteForm lote={lote} costos={(costos ?? []).map((c) => ({ concepto: c.concepto, monto: Number(c.monto) }))} productos={productos ?? []} maquiladores={maquiladores ?? []} />
      </Card>
    </>
  );
}
