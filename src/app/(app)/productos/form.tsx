"use client";

import { useActionState } from "react";
import { Button, Field, Alert, LinkButton } from "@/components/ui";
import { crearProducto, actualizarProducto } from "./actions";

export type Producto = {
  id: string; sku: string; nombre: string; presentacion: string | null; precio_lista: number;
  shopify_sku: string | null; amazon_sku: string | null; color: string | null; activo: boolean;
};

export function ProductoForm({ producto }: { producto?: Producto }) {
  const action = producto ? actualizarProducto.bind(null, producto.id) : crearProducto;
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid sm:grid-cols-2 gap-4 max-w-2xl">
      <Field label="SKU interno"><input name="sku" required defaultValue={producto?.sku} placeholder="ER-FRESA" /></Field>
      <Field label="Nombre"><input name="nombre" required defaultValue={producto?.nombre} /></Field>
      <Field label="Presentación"><input name="presentacion" defaultValue={producto?.presentacion ?? ""} placeholder="Bolsa 12 g" /></Field>
      <Field label="Precio de lista (MXN)"><input name="precio_lista" type="number" step="0.01" min="0" defaultValue={producto?.precio_lista ?? 49} /></Field>
      <Field label="SKU en Shopify"><input name="shopify_sku" defaultValue={producto?.shopify_sku ?? ""} /></Field>
      <Field label="SKU / ASIN en Amazon"><input name="amazon_sku" defaultValue={producto?.amazon_sku ?? ""} /></Field>
      <Field label="Color de etiqueta"><input name="color" type="color" defaultValue={producto?.color ?? "#0e4138"} className="h-10 p-1" /></Field>
      <div className="flex items-end pb-2">
        <label className="flex items-center gap-2 text-sm text-ink mb-0">
          <input type="checkbox" name="activo" defaultChecked={producto?.activo ?? true} className="w-auto" /> Activo
        </label>
      </div>
      {state?.error && <div className="sm:col-span-2"><Alert>{state.error}</Alert></div>}
      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
        <LinkButton href="/productos" variant="secondary">Cancelar</LinkButton>
      </div>
    </form>
  );
}
