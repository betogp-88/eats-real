"use client";

import { useActionState } from "react";
import { Button, Field, Alert } from "@/components/ui";
import { trasladar, ajustar } from "./actions";

type Lote = { id: string; codigo: string; producto: string };
type Ubic = { id: string; nombre: string; tipo: string };

export function TrasladoForm({ lotes, ubicaciones }: { lotes: Lote[]; ubicaciones: Ubic[] }) {
  const [state, action, pending] = useActionState(trasladar, undefined);
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-3">
      <Field label="Lote" className="sm:col-span-2">
        <select name="lote_id" required defaultValue=""><option value="" disabled>Selecciona…</option>{lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo} · {l.producto}</option>)}</select>
      </Field>
      <Field label="Desde"><select name="origen_id" required defaultValue={ubicaciones.find((u) => u.tipo === "almacen")?.id}>{ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></Field>
      <Field label="Hacia"><select name="destino_id" required defaultValue="">{ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></Field>
      <Field label="Cantidad"><input name="cantidad" type="number" min="1" required /></Field>
      <Field label="Nota"><input name="nota" placeholder="Entrega a tienda" /></Field>
      {state?.error && <div className="sm:col-span-2"><Alert>{state.error}</Alert></div>}
      {state?.ok && <div className="sm:col-span-2"><Alert kind="ok">{state.ok}</Alert></div>}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Trasladar</Button></div>
    </form>
  );
}

export function AjusteForm({ lotes, ubicaciones }: { lotes: Lote[]; ubicaciones: Ubic[] }) {
  const [state, action, pending] = useActionState(ajustar, undefined);
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-3">
      <Field label="Lote" className="sm:col-span-2">
        <select name="lote_id" required defaultValue=""><option value="" disabled>Selecciona…</option>{lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo} · {l.producto}</option>)}</select>
      </Field>
      <Field label="Ubicación"><select name="ubicacion_id" required defaultValue={ubicaciones.find((u) => u.tipo === "almacen")?.id}>{ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></Field>
      <Field label="Tipo"><select name="tipo" defaultValue="ajuste"><option value="ajuste">Ajuste (+ / −)</option><option value="merma">Merma (resta)</option></select></Field>
      <Field label="Cantidad"><input name="cantidad" type="number" required placeholder="−3 para restar" /></Field>
      <Field label="Nota"><input name="nota" placeholder="Conteo físico" /></Field>
      {state?.error && <div className="sm:col-span-2"><Alert>{state.error}</Alert></div>}
      {state?.ok && <div className="sm:col-span-2"><Alert kind="ok">{state.ok}</Alert></div>}
      <div className="sm:col-span-2"><Button type="submit" variant="secondary" disabled={pending}>Registrar</Button></div>
    </form>
  );
}
