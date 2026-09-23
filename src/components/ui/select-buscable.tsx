"use client";

import { useId, useState } from "react";

export type Opcion = { id: string; label: string; hint?: string };

/**
 * Selector con búsqueda para listas largas (puntos de venta, lotes).
 * Usa un input con datalist nativo; manda el id en un input oculto.
 */
export function SelectBuscable({ name, opciones, valorInicial, placeholder, required, onChange }: {
  name: string; opciones: Opcion[]; valorInicial?: string; placeholder?: string; required?: boolean; onChange?: (id: string) => void;
}) {
  const listId = useId();
  const inicial = opciones.find((o) => o.id === valorInicial);
  const [texto, setTexto] = useState(inicial?.label ?? "");
  const [id, setId] = useState(inicial?.id ?? "");
  const cambiar = (t: string) => {
    setTexto(t);
    const o = opciones.find((x) => x.label === t) ?? opciones.find((x) => x.label.toLowerCase() === t.toLowerCase());
    const nuevo = o?.id ?? "";
    setId(nuevo);
    onChange?.(nuevo);
  };
  return (
    <>
      <input list={listId} value={texto} onChange={(e) => cambiar(e.target.value)} placeholder={placeholder ?? "Escribe para buscar…"} required={required} autoComplete="off" className={id ? "" : texto ? "border-red-300" : ""} />
      <datalist id={listId}>{opciones.map((o) => <option key={o.id} value={o.label}>{o.hint}</option>)}</datalist>
      <input type="hidden" name={name} value={id} />
      {texto && !id && <p className="text-xs text-red-600 mt-1">Elige una opción de la lista.</p>}
    </>
  );
}
