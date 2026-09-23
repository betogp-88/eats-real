"use client";

import { ActionForm } from "@/components/ui/client";
import { Field } from "@/components/ui";
import { crearRuta, actualizarRuta } from "./actions";
import { DIAS } from "@/lib/utils";

export type Ruta = { id: string; nombre: string; dia_semana: number | null; cada_semanas: number; responsable_id: string | null; notas: string | null; activo: boolean };
type Perfil = { id: string; nombre: string | null; email: string };

export function RutaForm({ ruta, perfiles }: { ruta?: Ruta; perfiles: Perfil[] }) {
  const action = ruta ? actualizarRuta.bind(null, ruta.id) : crearRuta;
  return (
    <ActionForm action={action} submit={ruta ? "Guardar cambios" : "Crear ruta"}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nombre" className="sm:col-span-2"><input name="nombre" required defaultValue={ruta?.nombre} placeholder="Zona Norte" autoFocus={!ruta} /></Field>
        <Field label="Día de visita">
          <select name="dia_semana" defaultValue={ruta?.dia_semana ?? ""}>
            <option value="">Sin día fijo</option>
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </Field>
        <Field label="Frecuencia">
          <select name="cada_semanas" defaultValue={ruta?.cada_semanas ?? 1}>
            <option value={1}>Cada semana</option><option value={2}>Cada dos semanas</option><option value={3}>Cada tres semanas</option><option value={4}>Cada mes</option>
          </select>
        </Field>
        <Field label="Responsable">
          <select name="responsable_id" defaultValue={ruta?.responsable_id ?? ""}>
            <option value="">—</option>
            {perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre || p.email.split("@")[0]}</option>)}
          </select>
        </Field>
        <Field label="Notas"><input name="notas" defaultValue={ruta?.notas ?? ""} placeholder="Horario, estacionamiento, etc." /></Field>
      </div>
    </ActionForm>
  );
}
