"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Field } from "@/components/ui";
import { crearTarea, actualizarTarea, actualizarMiNombre } from "./actions";

export type Perfil = { id: string; nombre: string | null; email: string };
export type Tarea = { id: string; titulo: string; descripcion: string | null; asignado_a: string | null; prioridad: string; fecha_limite: string | null };

export const nombreDe = (p?: Perfil | null) => p?.nombre || p?.email?.split("@")[0] || "—";

function Campos({ tarea, perfiles, yo }: { tarea?: Tarea; perfiles: Perfil[]; yo: string }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Tarea" className="sm:col-span-2"><input name="titulo" required defaultValue={tarea?.titulo} placeholder="Qué hay que hacer" autoFocus={!tarea} /></Field>
      <Field label="Para">
        <select name="asignado_a" defaultValue={tarea?.asignado_a ?? yo}>
          {perfiles.map((p) => <option key={p.id} value={p.id}>{p.id === yo ? `Yo (${nombreDe(p)})` : nombreDe(p)}</option>)}
        </select>
      </Field>
      <Field label="Prioridad">
        <select name="prioridad" defaultValue={tarea?.prioridad ?? "media"}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select>
      </Field>
      <Field label="Fecha límite"><input name="fecha_limite" type="date" defaultValue={tarea?.fecha_limite ?? ""} /></Field>
      <Field label="Detalle" className="sm:col-span-2"><textarea name="descripcion" rows={2} defaultValue={tarea?.descripcion ?? ""} placeholder="Opcional" /></Field>
    </div>
  );
}

export function NuevaTareaForm({ perfiles, yo }: { perfiles: Perfil[]; yo: string }) {
  return <ActionForm action={crearTarea} submit="Agregar tarea" variant="accent"><Campos perfiles={perfiles} yo={yo} /></ActionForm>;
}

export function EditarTarea({ tarea, perfiles, yo }: { tarea: Tarea; perfiles: Perfil[]; yo: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="text-xs text-ink-soft hover:text-brand">Editar</button>;
  return (
    <div className="mt-2 rounded-lg border border-line bg-muted/30 p-3">
      <ActionForm action={actualizarTarea.bind(null, tarea.id)} submit="Guardar" variant="secondary" extra={<button type="button" onClick={() => setAbierto(false)} className="text-sm text-ink-soft">Cerrar</button>}>
        <Campos tarea={tarea} perfiles={perfiles} yo={yo} />
      </ActionForm>
    </div>
  );
}

export function MiNombreForm({ nombre }: { nombre: string | null }) {
  return (
    <ActionForm action={actualizarMiNombre} submit="Guardar" variant="secondary">
      <Field label="Cómo te ven los demás socios" hint="Aparece en las tareas que creas o te asignan"><input name="nombre" defaultValue={nombre ?? ""} placeholder="Tu nombre" /></Field>
    </ActionForm>
  );
}
