"use client";

import { ActionForm } from "@/components/ui/client";
import { Field } from "@/components/ui";
import { crearCliente, actualizarCliente } from "./actions";
import { CANALES } from "@/lib/utils";

export type Cliente = { id: string; nombre: string; telefono: string | null; email: string | null; direccion: string | null; canal_origen: string | null; notas: string | null };

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const action = cliente ? actualizarCliente.bind(null, cliente.id) : crearCliente;
  return (
    <ActionForm action={action} submit={cliente ? "Guardar cambios" : "Crear cliente"}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nombre"><input name="nombre" required defaultValue={cliente?.nombre} autoFocus={!cliente} /></Field>
        <Field label="Celular" hint="10 dígitos para el enlace de WhatsApp"><input name="telefono" type="tel" inputMode="tel" defaultValue={cliente?.telefono ?? ""} placeholder="55 1234 5678" /></Field>
        <Field label="Correo"><input name="email" type="email" defaultValue={cliente?.email ?? ""} /></Field>
        <Field label="Canal por el que llegó">
          <select name="canal_origen" defaultValue={cliente?.canal_origen ?? "directa"}>
            {Object.entries(CANALES).filter(([k]) => k !== "consignacion").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="referido">Referido</option>
            <option value="redes">Redes sociales</option>
          </select>
        </Field>
        <Field label="Dirección de envío" className="sm:col-span-2"><input name="direccion" defaultValue={cliente?.direccion ?? ""} /></Field>
        <Field label="Notas" className="sm:col-span-2"><textarea name="notas" rows={2} defaultValue={cliente?.notas ?? ""} placeholder="Preferencias, cómo le gusta que le entreguen, etc." /></Field>
      </div>
    </ActionForm>
  );
}
