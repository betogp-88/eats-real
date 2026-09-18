"use client";

import { useActionState, useState } from "react";
import { Button, Field, Alert, LinkButton } from "@/components/ui";
import { crearPedido } from "../actions";
import { hoy, CANALES } from "@/lib/utils";

type Producto = { id: string; nombre: string; precio_lista: number };
type Ubic = { id: string; nombre: string };

export function PedidoForm({ productos, consignaciones }: { productos: Producto[]; consignaciones: Ubic[] }) {
  const [state, action, pending] = useActionState(crearPedido, undefined);
  const [canal, setCanal] = useState("directa");
  const [lineas, setLineas] = useState([{ producto_id: productos[0]?.id ?? "", cantidad: 1, precio: productos[0]?.precio_lista ?? 0 }]);

  const setLinea = (i: number, patch: Partial<(typeof lineas)[number]>) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form action={action} className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Canal">
          <select name="canal" value={canal} onChange={(e) => setCanal(e.target.value)}>
            {Object.entries(CANALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Fecha"><input name="fecha" type="date" required defaultValue={hoy()} /></Field>
        <Field label="Referencia / No. de pedido"><input name="ref_externa" placeholder="#1234" /></Field>
        {canal === "consignacion" ? (
          <Field label="Punto de consignación">
            <select name="ubicacion_id" required defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {consignaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Field>
        ) : <Field label="Cliente"><input name="cliente_nombre" /></Field>}
        {canal === "consignacion" && <Field label="Cliente"><input name="cliente_nombre" /></Field>}
        <Field label="Correo"><input name="cliente_email" type="email" /></Field>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Productos</p>
        <table className="mb-2">
          <thead><tr><th>Producto</th><th className="w-28">Cantidad</th><th className="w-36">Precio unitario</th><th className="w-10"></th></tr></thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i}>
                <td>
                  <select name="producto_id" value={l.producto_id} onChange={(e) => { const p = productos.find((x) => x.id === e.target.value); setLinea(i, { producto_id: e.target.value, precio: p?.precio_lista ?? l.precio }); }}>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </td>
                <td><input name="cantidad" type="number" min="1" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: Number(e.target.value) })} /></td>
                <td><input name="precio_unitario" type="number" step="0.01" min="0" value={l.precio} onChange={(e) => setLinea(i, { precio: Number(e.target.value) })} /></td>
                <td><button type="button" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} className="text-red-600 text-lg leading-none" disabled={lineas.length === 1}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button type="button" variant="secondary" onClick={() => setLineas((ls) => [...ls, { producto_id: productos[0]?.id ?? "", cantidad: 1, precio: productos[0]?.precio_lista ?? 0 }])}>+ Agregar producto</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Descuento"><input name="descuento" type="number" step="0.01" min="0" defaultValue={0} /></Field>
        <Field label="Envío cobrado al cliente"><input name="envio_cobrado" type="number" step="0.01" min="0" defaultValue={0} /></Field>
        <Field label="Comisión de plataforma"><input name="comision_plataforma" type="number" step="0.01" min="0" defaultValue={0} /></Field>
        <Field label="Costo real del envío"><input name="costo_envio" type="number" step="0.01" min="0" defaultValue={0} /></Field>
        <Field label="Notas" className="sm:col-span-2 lg:col-span-4"><input name="notas" /></Field>
      </div>

      {state?.error && <Alert>{state.error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Crear pedido"}</Button>
        <LinkButton href="/pedidos" variant="secondary">Cancelar</LinkButton>
      </div>
    </form>
  );
}
