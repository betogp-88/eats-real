import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, LinkButton, Badge, Button, Empty } from "@/components/ui";
import { money } from "@/lib/utils";
import { crearMaquilador, crearUbicacion, toggleActivo } from "./actions";

export default async function ProductosPage() {
  const supabase = await createClient();
  const [{ data: productos }, { data: maquiladores }, { data: ubicaciones }] = await Promise.all([
    supabase.from("productos").select("*").order("nombre"),
    supabase.from("maquiladores").select("*").order("nombre"),
    supabase.from("ubicaciones").select("*").order("tipo").order("nombre"),
  ]);

  return (
    <>
      <PageHeader title="Catálogo" subtitle="Productos, maquiladores y ubicaciones de inventario" actions={<LinkButton href="/productos/nuevo">Nuevo producto</LinkButton>} />
      <Card title="Productos" className="mb-4">
        {!productos?.length ? <Empty>Aún no hay productos.</Empty> : (
          <table>
            <thead><tr><th>SKU</th><th>Producto</th><th>Presentación</th><th className="text-right">Precio</th><th>Shopify</th><th>Amazon</th><th></th></tr></thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className={!p.activo ? "opacity-50" : ""}>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td className="font-medium"><span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: p.color ?? "#0e4138" }} />{p.nombre}{!p.activo && <Badge>Inactivo</Badge>}</td>
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
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Maquiladores">
          <table className="mb-4">
            <tbody>
              {(maquiladores ?? []).map((m) => (
                <tr key={m.id} className={!m.activo ? "opacity-50" : ""}>
                  <td className="font-medium">{m.nombre}</td>
                  <td className="text-ink-soft">{m.contacto}</td>
                  <td className="text-right">
                    <form action={toggleActivo.bind(null, "maquiladores", m.id, !m.activo)}><button className="text-xs text-ink-soft hover:text-ink">{m.activo ? "Desactivar" : "Activar"}</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form action={crearMaquilador} className="flex gap-2 items-end">
            <div className="flex-1"><label>Nombre</label><input name="nombre" required /></div>
            <div className="flex-1"><label>Contacto</label><input name="contacto" /></div>
            <Button type="submit" variant="secondary">Agregar</Button>
          </form>
        </Card>
        <Card title="Ubicaciones de inventario">
          <table className="mb-4">
            <tbody>
              {(ubicaciones ?? []).map((u) => (
                <tr key={u.id} className={!u.activo ? "opacity-50" : ""}>
                  <td className="font-medium">{u.nombre}</td>
                  <td><Badge color={u.tipo === "almacen" ? "green" : u.tipo === "consignacion" ? "orange" : "gray"}>{u.tipo}</Badge></td>
                  <td className="text-right">
                    <form action={toggleActivo.bind(null, "ubicaciones", u.id, !u.activo)}><button className="text-xs text-ink-soft hover:text-ink">{u.activo ? "Desactivar" : "Activar"}</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form action={crearUbicacion} className="flex gap-2 items-end">
            <div className="flex-1"><label>Nombre</label><input name="nombre" required placeholder="Tienda / punto de venta" /></div>
            <div><label>Tipo</label><select name="tipo" defaultValue="consignacion"><option value="consignacion">Consignación</option><option value="almacen">Almacén</option><option value="merma">Merma</option></select></div>
            <Button type="submit" variant="secondary">Agregar</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
