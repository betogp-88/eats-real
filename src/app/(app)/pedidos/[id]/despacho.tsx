"use client";

import { useActionState, useState } from "react";
import { Button, Alert } from "@/components/ui";
import { despachar } from "../actions";
import { money, fecha } from "@/lib/utils";

export type LoteDisponible = { id: string; codigo: string; fecha_caducidad: string | null; costo_unitario: number; disponible: number };
export type LineaDespacho = { id: string; producto: string; cantidad: number; lotes: LoteDisponible[]; sugerido: Record<string, number> };

export function DespachoForm({ pedidoId, lineas }: { pedidoId: string; lineas: LineaDespacho[] }) {
  const [state, action, pending] = useActionState(despachar.bind(null, pedidoId), undefined);
  const [asig, setAsig] = useState<Record<string, Record<string, number>>>(() => Object.fromEntries(lineas.map((l) => [l.id, { ...l.sugerido }])));

  const set = (linea: string, lote: string, v: number) => setAsig((a) => ({ ...a, [linea]: { ...a[linea], [lote]: Math.max(0, v) } }));
  const asignado = (l: LineaDespacho) => Object.values(asig[l.id] ?? {}).reduce((s, v) => s + v, 0);
  const completo = lineas.every((l) => asignado(l) === l.cantidad);
  const costoTotal = lineas.reduce((s, l) => s + l.lotes.reduce((t, lo) => t + (asig[l.id]?.[lo.id] ?? 0) * Number(lo.costo_unitario), 0), 0);

  return (
    <form action={action} className="space-y-5">
      {lineas.map((l) => {
        const a = asignado(l);
        return (
          <div key={l.id} className="rounded-lg border border-line p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium">{l.producto} <span className="text-ink-soft font-normal">× {l.cantidad}</span></p>
              <span className={`text-xs font-medium ${a === l.cantidad ? "text-brand" : "text-red-600"}`}>{a} de {l.cantidad} asignadas</span>
            </div>
            {!l.lotes.length ? <p className="text-sm text-red-600">No hay existencias de este producto en la ubicación del pedido.</p> : (
              <table>
                <thead><tr><th>Lote</th><th>Caducidad</th><th className="text-right">Disponible</th><th className="text-right">Costo / bolsa</th><th className="w-28 text-right">Asignar</th></tr></thead>
                <tbody>
                  {l.lotes.map((lo) => (
                    <tr key={lo.id}>
                      <td className="font-mono text-xs">{lo.codigo}</td>
                      <td>{fecha(lo.fecha_caducidad) || "—"}</td>
                      <td className="text-right">{lo.disponible}</td>
                      <td className="text-right">{money(lo.costo_unitario)}</td>
                      <td><input name={`asig[${l.id}][${lo.id}]`} type="number" min={0} max={lo.disponible} value={asig[l.id]?.[lo.id] ?? 0} onChange={(e) => set(l.id, lo.id, Math.min(lo.disponible, Number(e.target.value)))} className="text-right" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">Costo de venta resultante: <strong className="text-ink">{money(costoTotal)}</strong></p>
        <Button type="submit" variant="accent" disabled={!completo || pending}>{pending ? "Despachando…" : "Confirmar despacho"}</Button>
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert kind="ok">{state.ok}</Alert>}
    </form>
  );
}
