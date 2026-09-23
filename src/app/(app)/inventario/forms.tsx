"use client";

import { ActionForm } from "@/components/ui/client";
import { Field } from "@/components/ui";
import { trasladar, ajustar } from "./actions";
import { SelectBuscable } from "@/components/ui/select-buscable";

type Lote = { id: string; codigo: string; producto: string; disponible: Record<string, number> };
type Ubic = { id: string; nombre: string; tipo: string };

const opcionesLote = (lotes: Lote[], ubic?: string) => lotes.map((l) => {
  const d = ubic ? l.disponible[ubic] ?? 0 : Object.values(l.disponible).reduce((s, v) => s + v, 0);
  return <option key={l.id} value={l.id}>{l.producto} · {l.codigo} ({d} disp.)</option>;
});

export function TrasladoForm({ lotes, ubicaciones, destinoInicial }: { lotes: Lote[]; ubicaciones: Ubic[]; destinoInicial?: string }) {
  const almacen = ubicaciones.find((u) => u.tipo === "almacen")?.id;
  return (
    <ActionForm action={trasladar} submit="Trasladar">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Lote" className="sm:col-span-2"><select name="lote_id" required defaultValue=""><option value="" disabled>Selecciona…</option>{opcionesLote(lotes.filter((l) => (l.disponible[almacen ?? ""] ?? 0) > 0 || Object.values(l.disponible).some((v) => v > 0)), almacen)}</select></Field>
        <Field label="Desde"><select name="origen_id" required defaultValue={almacen}>{ubicaciones.filter((u) => u.tipo !== "consignacion").map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}<optgroup label="Tiendas">{ubicaciones.filter((u) => u.tipo === "consignacion").map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</optgroup></select></Field>
        <Field label="Hacia" hint="Escribe el nombre de la tienda o ubicación"><SelectBuscable name="destino_id" opciones={ubicaciones.map((u) => ({ id: u.id, label: u.nombre, hint: u.tipo === "consignacion" ? "Tienda" : u.tipo }))} valorInicial={destinoInicial} required /></Field>
        <Field label="Bolsas"><input name="cantidad" type="number" min="1" required /></Field>
        <Field label="Nota"><input name="nota" placeholder="Entrega a tienda" /></Field>
      </div>
    </ActionForm>
  );
}

export function AjusteForm({ lotes, ubicaciones }: { lotes: Lote[]; ubicaciones: Ubic[] }) {
  return (
    <ActionForm action={ajustar} submit="Registrar" variant="secondary">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Lote" className="sm:col-span-2"><select name="lote_id" required defaultValue=""><option value="" disabled>Selecciona…</option>{opcionesLote(lotes)}</select></Field>
        <Field label="Ubicación"><select name="ubicacion_id" required defaultValue={ubicaciones.find((u) => u.tipo === "almacen")?.id}>{ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></Field>
        <Field label="Tipo"><select name="tipo" defaultValue="ajuste"><option value="ajuste">Ajuste por conteo (+ / −)</option><option value="merma">Merma (se resta)</option></select></Field>
        <Field label="Bolsas" hint="Con signo negativo para restar en ajuste"><input name="cantidad" type="number" required placeholder="−3" /></Field>
        <Field label="Motivo"><input name="nota" placeholder="Conteo físico, muestra, caducado…" /></Field>
      </div>
    </ActionForm>
  );
}
