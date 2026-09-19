"use client";

import { ActionForm } from "@/components/ui/client";
import { Field } from "@/components/ui";
import { crearPuntoVenta, actualizarPuntoVenta } from "./actions";

export type PuntoVenta = { id: string; nombre: string; contacto: string | null; telefono: string | null; email: string | null; direccion: string | null; modalidad: string; notas: string | null; activo: boolean };

export function PuntoVentaForm({ pv }: { pv?: PuntoVenta }) {
  const action = pv ? actualizarPuntoVenta.bind(null, pv.id) : crearPuntoVenta;
  return (
    <ActionForm action={action} submit={pv ? "Guardar cambios" : "Crear punto de venta"}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nombre de la tienda"><input name="nombre" required defaultValue={pv?.nombre} autoFocus={!pv} /></Field>
        <Field label="Modalidad" hint="Consignación: le dejas producto y te paga lo vendido. Directa: te compra y paga.">
          <select name="modalidad" defaultValue={pv?.modalidad ?? "consignacion"}>
            <option value="consignacion">Consignación</option>
            <option value="directa">Venta directa</option>
          </select>
        </Field>
        <Field label="Persona de contacto"><input name="contacto" defaultValue={pv?.contacto ?? ""} /></Field>
        <Field label="Celular"><input name="telefono" type="tel" defaultValue={pv?.telefono ?? ""} /></Field>
        <Field label="Correo"><input name="email" type="email" defaultValue={pv?.email ?? ""} /></Field>
        <Field label="Dirección"><input name="direccion" defaultValue={pv?.direccion ?? ""} /></Field>
        <Field label="Notas" className="sm:col-span-2"><textarea name="notas" rows={2} defaultValue={pv?.notas ?? ""} placeholder="Días de entrega, condiciones de pago, etc." /></Field>
      </div>
    </ActionForm>
  );
}
