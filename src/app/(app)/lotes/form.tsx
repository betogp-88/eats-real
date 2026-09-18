"use client";

import { useActionState } from "react";
import { Button, Field, Alert, LinkButton } from "@/components/ui";
import { crearLote, actualizarLote } from "./actions";
import { hoy } from "@/lib/utils";

type Opcion = { id: string; nombre: string };
export type Lote = {
  id: string; codigo: string; producto_id: string; maquilador_id: string | null; fecha_produccion: string;
  fecha_caducidad: string | null; bolsas_finales: number; estado: string; notas: string | null;
};

export function LoteForm({ lote, productos, maquiladores }: { lote?: Lote; productos: Opcion[]; maquiladores: Opcion[] }) {
  const action = lote ? actualizarLote.bind(null, lote.id) : crearLote;
  const [state, formAction, pending] = useActionState(action, undefined);
  const bloqueado = lote?.estado === "cerrado";
  return (
    <form action={formAction} className="grid sm:grid-cols-2 gap-4">
      {!lote && (
        <>
          <Field label="Código de lote"><input name="codigo" required placeholder="L-2026-001" /></Field>
          <Field label="Producto">
            <select name="producto_id" required defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
        </>
      )}
      <Field label="Maquilador">
        <select name="maquilador_id" defaultValue={lote?.maquilador_id ?? ""} disabled={bloqueado}>
          <option value="">—</option>
          {maquiladores.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </Field>
      <Field label="Bolsas finales"><input name="bolsas_finales" type="number" min="0" required defaultValue={lote?.bolsas_finales ?? 0} disabled={bloqueado || lote?.estado === "recibido"} /></Field>
      <Field label="Fecha de producción"><input name="fecha_produccion" type="date" required defaultValue={lote?.fecha_produccion ?? hoy()} disabled={bloqueado} /></Field>
      <Field label="Fecha de caducidad"><input name="fecha_caducidad" type="date" defaultValue={lote?.fecha_caducidad ?? ""} disabled={bloqueado} /></Field>
      <Field label="Notas" className="sm:col-span-2"><textarea name="notas" rows={2} defaultValue={lote?.notas ?? ""} disabled={bloqueado} /></Field>
      {state?.error && <div className="sm:col-span-2"><Alert>{state.error}</Alert></div>}
      {!bloqueado && (
        <div className="sm:col-span-2 flex gap-2">
          <Button type="submit" disabled={pending}>{pending ? "Guardando…" : lote ? "Guardar cambios" : "Crear lote"}</Button>
          {!lote && <LinkButton href="/lotes" variant="secondary">Cancelar</LinkButton>}
        </div>
      )}
      {lote?.estado === "recibido" && <p className="sm:col-span-2 text-xs text-ink-soft">Las bolsas finales ya no se editan porque el lote ya entró a inventario. Usa un ajuste de inventario si hubo diferencia.</p>}
    </form>
  );
}
