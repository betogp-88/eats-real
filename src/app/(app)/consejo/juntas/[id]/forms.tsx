"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, Button } from "@/components/ui";
import { guardarMinuta, crearCompromiso, guardarAvances } from "../../actions";
import { AREAS, formatoUnidad, type Meta } from "@/lib/consejo";

type Perfil = { id: string; nombre: string };

export function MinutaForm({ junta, editable }: { junta: { id: string; fecha: string | null; asistentes: string | null; acuerdos: string | null; minuta: Record<string, string> }; editable: boolean }) {
  const fechaLocal = junta.fecha ? new Date(junta.fecha).toISOString().slice(0, 16) : "";
  return (
    <ActionForm action={guardarMinuta.bind(null, junta.id)} submit="Guardar minuta" className={editable ? "" : "[&_button[type=submit]]:hidden"}>
      <fieldset disabled={!editable} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Fecha y hora de la junta"><input name="fecha" type="datetime-local" defaultValue={fechaLocal} /></Field>
          <Field label="Asistentes"><input name="asistentes" defaultValue={junta.asistentes ?? ""} placeholder="Nombres" /></Field>
        </div>
        {AREAS.map((a) => (
          <Field key={a.key} label={a.label} hint={editable ? a.guia : undefined}>
            <textarea name={`minuta[${a.key}]`} rows={4} defaultValue={junta.minuta?.[a.key] ?? ""} className="whitespace-pre-wrap" />
          </Field>
        ))}
        <Field label="Acuerdos generales" hint="Decisiones tomadas en la junta"><textarea name="acuerdos" rows={3} defaultValue={junta.acuerdos ?? ""} /></Field>
      </fieldset>
    </ActionForm>
  );
}

export function CompromisoForm({ juntaId, perfiles }: { juntaId: string; perfiles: Perfil[] }) {
  return (
    <ActionForm action={crearCompromiso.bind(null, juntaId)} submit="Agregar compromiso" variant="secondary">
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Compromiso" className="sm:col-span-4"><input name="descripcion" required placeholder="Qué se va a hacer" /></Field>
        <Field label="Área"><select name="area" defaultValue=""><option value="">—</option>{AREAS.map((a) => <option key={a.key} value={a.label}>{a.label}</option>)}</select></Field>
        <Field label="Responsable"><select name="responsable_id" defaultValue=""><option value="">—</option>{perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field>
        <Field label="Fecha límite"><input name="fecha_limite" type="date" /></Field>
      </div>
    </ActionForm>
  );
}

export function AvancesForm({ mes, juntaId, metas, valores, editable }: { mes: string; juntaId: string; metas: Meta[]; valores: Record<string, { valor: number; nota: string | null }>; editable: boolean }) {
  if (!metas.length) return <p className="text-sm text-ink-soft">No hay metas manuales este año.</p>;
  return (
    <ActionForm action={guardarAvances.bind(null, mes, juntaId)} submit="Guardar avances" variant="secondary" className={editable ? "" : "[&_button[type=submit]]:hidden"}>
      <fieldset disabled={!editable} className="space-y-3">
        {metas.map((m) => (
          <div key={m.id} className="grid sm:grid-cols-[1fr_10rem_1fr] gap-2 items-end">
            <div><p className="text-sm font-medium">{m.nombre}</p><p className="text-xs text-ink-soft">Meta {formatoUnidad(Number(m.valor_meta), m.unidad)}</p></div>
            <Field label={`Acumulado (${m.unidad})`}><input name={`avance[${m.id}]`} type="number" step="any" defaultValue={valores[m.id]?.valor ?? ""} /></Field>
            <Field label="Nota"><input name={`nota[${m.id}]`} defaultValue={valores[m.id]?.nota ?? ""} /></Field>
          </div>
        ))}
      </fieldset>
    </ActionForm>
  );
}

export function BotonImprimir() {
  return <Button type="button" variant="secondary" onClick={() => window.print()}>Imprimir / PDF</Button>;
}
