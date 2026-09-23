"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, MoneyInput } from "@/components/ui";
import { crearMeta, actualizarMeta } from "../actions";
import type { Meta } from "@/lib/consejo";

type Perfil = { id: string; nombre: string };
const UNIDADES = ["MXN", "bolsas", "tiendas", "clientes", "pedidos", "%", "personas", "otra"];

export function MetaForm({ meta, anio, perfiles, hayVentas }: { meta?: Meta; anio: number; perfiles: Perfil[]; hayVentas: boolean }) {
  const action = meta ? actualizarMeta.bind(null, meta.id) : crearMeta;
  const tipo = meta?.tipo ?? (hayVentas ? "manual" : "ventas");
  return (
    <ActionForm action={action} submit={meta ? "Guardar" : "Agregar meta"} variant={meta ? "secondary" : "primary"}>
      <input type="hidden" name="anio" value={meta?.anio ?? anio} />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Tipo" hint="«Ventas» se calcula sola con las ventas netas del sistema. «Manual» la actualizas en cada junta.">
          <select name="tipo" defaultValue={tipo}><option value="ventas">Ventas del sistema</option><option value="manual">Manual</option></select>
        </Field>
        <Field label="Nombre"><input name="nombre" required defaultValue={meta?.nombre ?? (tipo === "ventas" ? `Ventas ${anio}` : "")} placeholder="Abrir 50 puntos de venta nuevos" /></Field>
        <Field label="Meta"><MoneyInput name="valor_meta" required defaultValue={meta?.valor_meta ?? ""} step="1" /></Field>
        <Field label="Unidad" hint="Para ventas siempre es MXN"><input name="unidad" list="unidades" defaultValue={meta?.unidad ?? "MXN"} /><datalist id="unidades">{UNIDADES.map((u) => <option key={u} value={u} />)}</datalist></Field>
        <Field label="Responsable"><select name="responsable_id" defaultValue={meta?.responsable_id ?? ""}><option value="">—</option>{perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field>
        <Field label="Orden"><input name="orden" type="number" defaultValue={meta?.orden ?? 0} /></Field>
        <Field label="Descripción" className="sm:col-span-2"><input name="descripcion" defaultValue={meta?.descripcion ?? ""} placeholder="Cómo se mide, qué cuenta y qué no" /></Field>
      </div>
    </ActionForm>
  );
}
