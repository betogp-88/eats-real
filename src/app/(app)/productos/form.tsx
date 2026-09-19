"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, LinkButton, MoneyInput } from "@/components/ui";
import { crearProducto, actualizarProducto } from "./actions";

export type Producto = { id: string; sku: string; nombre: string; presentacion: string | null; precio_lista: number; shopify_sku: string | null; amazon_sku: string | null; color: string | null; activo: boolean };

export function ProductoForm({ producto }: { producto?: Producto }) {
  const action = producto ? actualizarProducto.bind(null, producto.id) : crearProducto;
  return (
    <ActionForm action={action} submit={producto ? "Guardar cambios" : "Crear producto"} extra={<LinkButton href="/productos" variant="ghost">Cancelar</LinkButton>}>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        <Field label="SKU interno"><input name="sku" required defaultValue={producto?.sku} placeholder="ER-FRESA" /></Field>
        <Field label="Nombre"><input name="nombre" required defaultValue={producto?.nombre} /></Field>
        <Field label="Presentación"><input name="presentacion" defaultValue={producto?.presentacion ?? ""} placeholder="Bolsa 12 g" /></Field>
        <Field label="Precio de lista"><MoneyInput name="precio_lista" defaultValue={producto?.precio_lista ?? 49} /></Field>
        <Field label="SKU en Shopify" hint="Para la sincronización futura"><input name="shopify_sku" defaultValue={producto?.shopify_sku ?? ""} /></Field>
        <Field label="SKU en Amazon" hint="Tal como aparece en el reporte de pedidos"><input name="amazon_sku" defaultValue={producto?.amazon_sku ?? ""} /></Field>
        <Field label="Color de etiqueta"><input name="color" type="color" defaultValue={producto?.color ?? "#0e4138"} className="h-10 p-1 w-20" /></Field>
        <label className="flex items-center gap-2 text-sm text-ink mb-0 self-end pb-2"><input type="checkbox" name="activo" defaultChecked={producto?.activo ?? true} className="w-auto" /> Activo (aparece en pedidos y lotes)</label>
      </div>
    </ActionForm>
  );
}
