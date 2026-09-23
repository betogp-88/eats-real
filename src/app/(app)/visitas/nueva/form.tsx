"use client";

import { useActionState, useState } from "react";
import { Button, Field, Alert, MoneyInput, LinkButton } from "@/components/ui";
import { registrarVisita } from "../actions";
import { money, num } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { empresa } from "@/lib/empresa";

export type ProductoVisita = { id: string; nombre: string; precio_lista: number; stock: number; almacen: number };

const RESULTADOS = [
  { value: "venta", label: "Visita normal (contar, cobrar, reponer)" },
  { value: "sin_pedido", label: "Sin movimiento (no vendió, no repuse)" },
  { value: "cerrada", label: "Estaba cerrada" },
  { value: "no_encontrada", label: "No encontré al encargado" },
  { value: "ya_no_vende", label: "Ya no quiere vender" },
];

export function VisitaForm({ pv, rutaId, productos }: { pv: { id: string; nombre: string; modalidad: string; saldo: number }; rutaId?: string; productos: ProductoVisita[] }) {
  const [state, action, pending] = useActionState(registrarVisita, undefined);
  const consig = pv.modalidad === "consignacion";
  const [resultado, setResultado] = useState("venta");
  const [lineas, setLineas] = useState(productos.map((p) => ({ ...p, contadas: "" as string, dejo: "" as string, precio: p.precio_lista })));
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia" | "pendiente">("efectivo");
  const [cobro, setCobro] = useState<string>("");
  const [fotos, setFotos] = useState<{ path: string; url: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [errFoto, setErrFoto] = useState<string | null>(null);

  const set = (i: number, patch: Partial<(typeof lineas)[number]>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const vendidoDe = (l: (typeof lineas)[number]) => consig ? (l.contadas === "" ? 0 : Math.max(l.stock - Number(l.contadas), 0)) : Number(l.dejo) || 0;
  const totalVenta = lineas.reduce((s, l) => s + vendidoDe(l) * l.precio, 0);
  const totalBolsas = lineas.reduce((s, l) => s + vendidoDe(l), 0);
  const totalRepuesto = lineas.reduce((s, l) => s + (Number(l.dejo) || 0), 0);
  const cobroSugerido = totalVenta + (consig ? pv.saldo : 0);

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    setSubiendo(true); setErrFoto(null);
    const supabase = createClient();
    for (const f of Array.from(files)) {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${empresa.slug}/${pv.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("visitas").upload(path, f, { contentType: f.type || "image/jpeg" });
      if (error) { setErrFoto(`No se pudo subir ${f.name}: ${error.message}`); continue; }
      setFotos((fs) => [...fs, { path, url: URL.createObjectURL(f) }]);
    }
    setSubiendo(false);
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="punto_venta_id" value={pv.id} />
      {rutaId && <input type="hidden" name="ruta_id" value={rutaId} />}
      <Field label="Cómo fue la visita">
        <select name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value)}>{RESULTADOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
      </Field>

      {resultado === "venta" && (
        <>
          <div>
            <p className="text-sm font-semibold mb-1">Producto</p>
            <p className="text-xs text-ink-soft mb-2">{consig ? "Escribe cuántas bolsas quedaban de cada producto. Lo que falta contra lo que dejaste la vez pasada es lo vendido. Luego cuántas dejas hoy." : "Escribe cuántas bolsas le entregas de cada producto. La tienda te las compra."}</p>
            <div className="overflow-x-auto -mx-4 px-4">
              <table>
                <thead><tr><th>Producto</th>{consig && <><th className="text-right">Dejé</th><th className="w-24 text-right">Quedan</th><th className="text-right">Vendió</th></>}<th className="w-24 text-right">{consig ? "Dejo hoy" : "Entrego"}</th><th className="w-28 text-right">Precio</th><th className="text-right">Importe</th></tr></thead>
                <tbody>
                  {lineas.map((l, i) => {
                    const v = vendidoDe(l);
                    return (
                      <tr key={l.id}>
                        <td className="font-medium">{l.nombre}<input type="hidden" name="producto_id" value={l.id} /><p className="text-[11px] text-ink-soft font-normal">Almacén: {num(l.almacen)}</p></td>
                        {consig && <>
                          <td className="text-right">{num(l.stock)}</td>
                          <td><input name="contadas" type="number" min={0} inputMode="numeric" value={l.contadas} onChange={(e) => set(i, { contadas: e.target.value })} placeholder={l.stock ? "?" : "0"} className="text-right" /></td>
                          <td className={`text-right font-medium ${v > 0 ? "text-brand" : ""}`}>{l.contadas === "" ? "—" : v}{l.contadas !== "" && Number(l.contadas) > l.stock && <span className="block text-[10px] text-orange-700">+{Number(l.contadas) - l.stock} de más</span>}</td>
                        </>}
                        <td><input name="dejo" type="number" min={0} inputMode="numeric" value={l.dejo} onChange={(e) => set(i, { dejo: e.target.value })} placeholder="0" className="text-right" /></td>
                        <td><MoneyInput name="precio" value={l.precio} onChange={(e) => set(i, { precio: Number(e.target.value) })} /></td>
                        <td className="text-right">{v > 0 ? money(v * l.precio) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-ink-soft mt-2">Vendió <strong className="text-ink">{totalBolsas} bolsas</strong> = <strong className="text-brand">{money(totalVenta)}</strong>{consig && <> · Repones <strong className="text-ink">{totalRepuesto}</strong> bolsas</>}</p>
          </div>

          <div className="rounded-lg border border-line p-4 grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3 flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold">Cobro</span>
              <span className="text-ink-soft">Venta de hoy {money(totalVenta)}{consig && pv.saldo > 0 && <> + saldo anterior <span className="text-red-600">{money(pv.saldo)}</span></>} = <strong className="text-ink">{money(cobroSugerido)}</strong></span>
            </div>
            <Field label="Forma de pago">
              <select name="cobro_metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as typeof metodo)}>
                <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="pendiente">Queda pendiente</option>
              </select>
            </Field>
            <Field label="Monto cobrado" hint={metodo === "pendiente" ? "Se suma al saldo de la tienda" : "Lo que recibiste hoy"}>
              <MoneyInput name="cobro_monto" value={metodo === "pendiente" ? "" : cobro === "" ? (cobroSugerido || "") : cobro} onChange={(e) => setCobro(e.target.value)} disabled={metodo === "pendiente"} placeholder="0.00" />
            </Field>
          </div>
        </>
      )}

      <div>
        <p className="text-sm font-semibold mb-1">Fotos de la visita</p>
        <p className="text-xs text-ink-soft mb-2">Exhibidor, ticket o lo que compruebe la visita. Desde el celular abre la cámara.</p>
        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => subir(e.target.files)} disabled={subiendo} className="text-sm" />
        {subiendo && <p className="text-xs text-ink-soft mt-1">Subiendo…</p>}
        {errFoto && <Alert>{errFoto}</Alert>}
        {fotos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {fotos.map((f) => (
              <div key={f.path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="w-20 h-20 object-cover rounded-lg border border-line" />
                <input type="hidden" name="fotos" value={f.path} />
                <button type="button" onClick={() => setFotos((fs) => fs.filter((x) => x.path !== f.path))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="Notas"><textarea name="notas" rows={2} placeholder="Qué pidió la tienda, incidencias, etc." /></Field>

      {state?.error && <Alert>{state.error}</Alert>}
      <div className="flex flex-wrap gap-2 justify-end border-t border-line pt-4">
        <LinkButton href={rutaId ? `/rutas/${rutaId}` : `/puntos-venta/${pv.id}`} variant="ghost">Cancelar</LinkButton>
        <Button type="submit" variant="accent" disabled={pending || subiendo}>{pending ? "Registrando…" : "Registrar visita"}</Button>
      </div>
    </form>
  );
}
