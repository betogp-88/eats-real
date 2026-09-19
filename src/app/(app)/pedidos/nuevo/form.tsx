"use client";

import { useActionState, useState } from "react";
import { Button, Field, Alert, LinkButton, MoneyInput } from "@/components/ui";
import { crearPedido } from "../actions";
import { hoy, money, MODALIDADES } from "@/lib/utils";
import { ClienteSelector } from "@/app/(app)/clientes/selector";

type Producto = { id: string; nombre: string; precio_lista: number };
type PV = { id: string; nombre: string; modalidad: string };
type Cliente = { id: string; nombre: string; telefono: string | null };

const CANALES_FORM = [
  { value: "directa", label: "Venta directa" },
  { value: "punto_venta", label: "Punto de venta" },
  { value: "shopify", label: "Shopify (captura manual)" },
  { value: "amazon", label: "Amazon (captura manual)" },
];

export function PedidoForm({ productos, puntosVenta, clienteInicial, puntoVentaInicial }: { productos: Producto[]; puntosVenta: PV[]; clienteInicial?: Cliente | null; puntoVentaInicial?: string }) {
  const [state, action, pending] = useActionState(crearPedido, undefined);
  const [canal, setCanal] = useState(puntoVentaInicial ? "punto_venta" : "directa");
  const [pvId, setPvId] = useState(puntoVentaInicial ?? puntosVenta[0]?.id ?? "");
  const [lineas, setLineas] = useState([{ producto_id: productos[0]?.id ?? "", cantidad: 1, precio: productos[0]?.precio_lista ?? 0 }]);
  const [descuento, setDescuento] = useState(0);
  const [envio, setEnvio] = useState(0);
  const pv = puntosVenta.find((p) => p.id === pvId);
  const setLinea = (i: number, patch: Partial<(typeof lineas)[number]>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const total = subtotal - descuento + envio;

  return (
    <form action={action} className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Canal">
          <select name="canal" value={canal} onChange={(e) => setCanal(e.target.value)}>{CANALES_FORM.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        </Field>
        <Field label="Fecha"><input name="fecha" type="date" required defaultValue={hoy()} /></Field>
        <Field label="Referencia" hint={canal === "shopify" || canal === "amazon" ? "Número de pedido en la plataforma" : "Opcional"}><input name="ref_externa" placeholder={canal === "shopify" ? "#1234" : ""} /></Field>
      </div>

      {canal === "punto_venta" ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Punto de venta">
            <select name="punto_venta_id" value={pvId} onChange={(e) => setPvId(e.target.value)} required>
              {!puntosVenta.length && <option value="">Primero crea un punto de venta</option>}
              {puntosVenta.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          {pv && (
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-ink-soft self-end">
              <strong className="text-ink">{MODALIDADES[pv.modalidad]}.</strong> {pv.modalidad === "consignacion" ? "Registras lo que la tienda reportó vendido; sale del inventario que tiene en tienda." : "La tienda te compra; sale del almacén."}
            </div>
          )}
        </div>
      ) : canal === "directa" ? (
        clienteInicial ? (
          <div className="rounded-lg border border-brand-light/60 bg-brand-light/10 px-3 py-2 text-sm"><span className="font-medium">{clienteInicial.nombre}</span>{clienteInicial.telefono && <span className="text-ink-soft"> · {clienteInicial.telefono}</span>}<input type="hidden" name="cliente_id" value={clienteInicial.id} /></div>
        ) : <ClienteSelector />
      ) : (
        <Field label="Nombre del cliente" hint="Opcional; en Shopify y Amazon el dato vive en la plataforma"><input name="cliente_nombre_libre" /></Field>
      )}

      <div>
        <p className="text-sm font-semibold mb-2">Productos</p>
        <div className="space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_8rem_2rem] gap-2 items-center">
              <select name="producto_id" value={l.producto_id} onChange={(e) => { const p = productos.find((x) => x.id === e.target.value); setLinea(i, { producto_id: e.target.value, precio: p?.precio_lista ?? l.precio }); }}>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <input name="cantidad" type="number" min="1" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: Number(e.target.value) })} aria-label="Cantidad" />
              <MoneyInput name="precio_unitario" value={l.precio} onChange={(e) => setLinea(i, { precio: Number(e.target.value) })} aria-label="Precio unitario" />
              <button type="button" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} className="text-red-600 text-lg leading-none" disabled={lineas.length === 1} aria-label="Quitar">×</button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3">
          <Button type="button" variant="secondary" onClick={() => setLineas((ls) => [...ls, { producto_id: productos[0]?.id ?? "", cantidad: 1, precio: productos[0]?.precio_lista ?? 0 }])}>+ Agregar producto</Button>
          <p className="text-sm text-ink-soft">{lineas.reduce((s, l) => s + l.cantidad, 0)} bolsas · subtotal <strong className="text-ink">{money(subtotal)}</strong></p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Descuento"><MoneyInput name="descuento" value={descuento || ""} onChange={(e) => setDescuento(Number(e.target.value))} placeholder="0.00" /></Field>
        <Field label="Envío cobrado al cliente"><MoneyInput name="envio_cobrado" value={envio || ""} onChange={(e) => setEnvio(Number(e.target.value))} placeholder="0.00" /></Field>
        <Field label="Comisión de plataforma" hint="Lo que cobra Shopify, Amazon o la tienda"><MoneyInput name="comision_plataforma" placeholder="0.00" /></Field>
        <Field label="Costo real del envío" hint="Lo que pagaste a la paquetería"><MoneyInput name="costo_envio" placeholder="0.00" /></Field>
        <Field label="Notas" className="sm:col-span-2 lg:col-span-4"><input name="notas" /></Field>
      </div>

      {state?.error && <Alert>{state.error}</Alert>}
      <div className="flex flex-wrap gap-2 items-center justify-between border-t border-line pt-4">
        <p className="text-lg">Total <strong className="text-brand">{money(total)}</strong></p>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/pedidos" variant="ghost">Cancelar</LinkButton>
          <Button type="submit" name="accion" value="guardar" variant="secondary" disabled={pending}>Guardar pendiente</Button>
          <Button type="submit" name="accion" value="despachar" variant="accent" disabled={pending}>{pending ? "Guardando…" : "Guardar y despachar"}</Button>
        </div>
      </div>
      <p className="text-xs text-ink-soft">«Guardar y despachar» descuenta inventario del lote más próximo a caducar. «Guardar pendiente» lo deja para asignar el lote después.</p>
    </form>
  );
}
