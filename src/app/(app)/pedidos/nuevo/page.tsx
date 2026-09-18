import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { PedidoForm } from "./form";

export default async function NuevoPedidoPage() {
  const supabase = await createClient();
  const [{ data: productos }, { data: ubicaciones }] = await Promise.all([
    supabase.from("productos").select("id, nombre, precio_lista").eq("activo", true).order("nombre"),
    supabase.from("ubicaciones").select("id, nombre").eq("tipo", "consignacion").eq("activo", true).order("nombre"),
  ]);
  return (
    <>
      <PageHeader title="Nuevo pedido" subtitle="Venta directa, de consignación o captura manual de otro canal" />
      <Card><PedidoForm productos={productos ?? []} consignaciones={ubicaciones ?? []} /></Card>
    </>
  );
}
