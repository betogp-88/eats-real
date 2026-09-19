import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Empty, Field } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { money } from "@/lib/utils";
import { crearUbicacion, toggleUbicacion } from "./actions";

export default async function ProductosPage() {
  const supabase = await createClient();
  const [{ data: productos }, { data: ubicaciones }] = await Promise.all([
    supabase.from("productos").select("*").order("nombre"),
    supabase.from("ubicaciones").select("*").in("tipo", ["almacen", "merma"]).order("tipo").order("nombre"),
  ]);

  return (
    <>
      <PageHeader title="Productos y almacén" subtitle="Catálogo de SKUs y ubicaciones propias. Las tiendas se administran en Puntos de venta." actions={<LinkButton href="/productos/nuevo">Nuevo producto</LinkButton>} />
      <Card title="Productos" className="mb-4" padded={false}>
        {!productos?.length ? <Empty>Aún no hay productos.</Empty> : (
          <table>
            <thead><tr><th>Producto</th><th>SKU</th><th>Presentación</th><th className="text-right">Precio</th><th>Shopify</th><th>Amazon</th><th></th></tr></thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className={!p.activo ? "opacity-50" : ""}>
                  <td className="font-medium"><span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: p.color ?? "#0e4138" }} />{p.nombre} {!p.activo && <Badge>Inactivo</Badge>}</td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.presentacion}</td>
                  <td className="text-right">{money(p.precio_lista)}</td>
                  <td className="text-xs text-ink-soft">{p.shopify_sku ?? "—"}</td>
                  <td className="text-xs text-ink-soft">{p.amazon_sku ?? "—"}</td>
                  <td className="text-right"><Link href={`/productos/${p.id}`} className="text-brand hover:underline">Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Ubicaciones propias" className="max-w-2xl">
        <table className="mb-4">
          <tbody>
            {(ubicaciones ?? []).map((u) => (
              <tr key={u.id} className={!u.activo ? "opacity-50" : ""}>
                <td className="font-medium">{u.nombre}</td>
                <td><Badge color={u.tipo === "almacen" ? "green" : "gray"}>{u.tipo === "almacen" ? "Almacén" : "Merma"}</Badge></td>
                <td className="text-right"><ConfirmButton action={async () => { "use server"; return toggleUbicacion(u.id, !u.activo); }} confirmText={u.activo ? "¿Desactivar esta ubicación?" : "¿Activar esta ubicación?"} variant="ghost">{u.activo ? "Desactivar" : "Activar"}</ConfirmButton></td>
              </tr>
            ))}
          </tbody>
        </table>
        <ActionForm action={crearUbicacion} submit="Agregar" variant="secondary">
          <div className="flex gap-2 items-end">
            <Field label="Nombre" className="flex-1"><input name="nombre" required placeholder="Almacén 2, Bodega…" /></Field>
            <Field label="Tipo"><select name="tipo" defaultValue="almacen"><option value="almacen">Almacén</option><option value="merma">Merma</option></select></Field>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
