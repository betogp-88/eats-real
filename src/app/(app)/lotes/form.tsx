"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Field, MoneyInput, Button, LinkButton } from "@/components/ui";
import { crearLote, actualizarLote } from "./actions";
import { hoy, money, CONCEPTOS_LOTE } from "@/lib/utils";

type Opcion = { id: string; nombre: string };
export type Lote = { id: string; codigo: string; producto_id: string; maquilador_id: string | null; fecha_produccion: string; fecha_caducidad: string | null; bolsas_finales: number; estado: string; notas: string | null };
type Costo = { concepto: string; monto: number };

export function LoteForm({ lote, costos: iniciales, productos, maquiladores }: { lote?: Lote; costos?: Costo[]; productos: Opcion[]; maquiladores: Opcion[] }) {
  const action = lote ? actualizarLote.bind(null, lote.id) : crearLote;
  const [costos, setCostos] = useState<Costo[]>(iniciales?.length ? iniciales : [{ concepto: "Maquila", monto: 0 }, { concepto: "Empaque", monto: 0 }]);
  const [bolsas, setBolsas] = useState(lote?.bolsas_finales ?? 0);
  const cerrado = lote?.estado === "cerrado";
  const total = costos.reduce((s, c) => s + (c.monto || 0), 0);
  const set = (i: number, patch: Partial<Costo>) => setCostos((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <ActionForm action={action} submit={lote ? "Guardar cambios" : "Crear lote"} extra={!lote && <LinkButton href="/lotes" variant="secondary">Cancelar</LinkButton>}>
      <fieldset disabled={cerrado} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          {!lote ? (
            <>
              <Field label="Código de lote" hint="Como lo identifica el maquilador o tú, p. ej. L-2026-001"><input name="codigo" required placeholder="L-2026-001" autoFocus /></Field>
              <Field label="Producto">
                <select name="producto_id" required defaultValue=""><option value="" disabled>Selecciona…</option>{productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
              </Field>
            </>
          ) : null}
          <Field label="Maquilador">
            <select name="maquilador_id" defaultValue={lote?.maquilador_id ?? ""}><option value="">—</option>{maquiladores.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
          </Field>
          <Field label="Bolsas finales" hint={lote?.estado === "recibido" ? "Ya entró a inventario; corrige con un ajuste en Inventario." : undefined}>
            <input name="bolsas_finales" type="number" min="0" required value={bolsas} onChange={(e) => setBolsas(Number(e.target.value))} disabled={lote?.estado === "recibido"} />
          </Field>
          <Field label="Fecha de producción"><input name="fecha_produccion" type="date" required defaultValue={lote?.fecha_produccion ?? hoy()} /></Field>
          <Field label="Fecha de caducidad"><input name="fecha_caducidad" type="date" defaultValue={lote?.fecha_caducidad ?? ""} /></Field>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Costos del lote</p>
          <div className="space-y-2">
            {costos.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input name="concepto" list="conceptos" value={c.concepto} onChange={(e) => set(i, { concepto: e.target.value })} placeholder="Concepto" className="flex-1" />
                <div className="w-40"><MoneyInput name="monto" value={c.monto || ""} onChange={(e) => set(i, { monto: Number(e.target.value) })} placeholder="0.00" /></div>
                <button type="button" onClick={() => setCostos((cs) => cs.filter((_, j) => j !== i))} className="text-red-600 text-lg leading-none px-1" aria-label="Quitar">×</button>
              </div>
            ))}
            <datalist id="conceptos">{CONCEPTOS_LOTE.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="flex items-center justify-between mt-3">
            <Button type="button" variant="secondary" onClick={() => setCostos((cs) => [...cs, { concepto: "", monto: 0 }])}>+ Agregar costo</Button>
            <p className="text-sm text-ink-soft">Total <strong className="text-ink">{money(total)}</strong>{bolsas > 0 && <> · <strong className="text-brand">{money(total / bolsas)}</strong> por bolsa</>}</p>
          </div>
        </div>

        <Field label="Notas"><textarea name="notas" rows={2} defaultValue={lote?.notas ?? ""} /></Field>

        {!lote && (
          <label className="flex items-start gap-3 rounded-lg border border-line bg-muted/40 p-3 text-sm text-ink mb-0 cursor-pointer">
            <input type="checkbox" name="recibido" className="w-auto mt-0.5" defaultChecked />
            <span><strong>El producto ya está en el almacén.</strong><br /><span className="text-ink-soft text-xs">Da entrada a inventario con las bolsas finales. Si aún no llega, desmárcalo y queda en borrador.</span></span>
          </label>
        )}
      </fieldset>
    </ActionForm>
  );
}
