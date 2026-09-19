"use client";

import { useRef, useState } from "react";
import { buscarClientes, type ClienteBusqueda } from "./actions";
import { Field } from "@/components/ui";

/**
 * Selector de cliente para el formulario de pedido.
 * Escribe nombre o celular; si existe lo selecciona, si no, se crea con lo capturado.
 */
export function ClienteSelector() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<ClienteBusqueda[]>([]);
  const [sel, setSel] = useState<ClienteBusqueda | null>(null);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cambiar = (valor: string) => {
    setQ(valor);
    if (timer.current) clearTimeout(timer.current);
    if (valor.trim().length < 2) { setRes([]); return; }
    timer.current = setTimeout(async () => { setRes(await buscarClientes(valor)); setAbierto(true); }, 250);
  };

  if (sel) {
    return (
      <div className="rounded-lg border border-brand-light/60 bg-brand-light/10 px-3 py-2 flex items-start justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium text-ink">{sel.nombre}</p>
          <p className="text-ink-soft text-xs">{[sel.telefono, sel.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
        </div>
        <button type="button" onClick={() => { setSel(null); setQ(""); setRes([]); }} className="text-xs text-ink-soft hover:text-ink">Cambiar</button>
        <input type="hidden" name="cliente_id" value={sel.id} />
      </div>
    );
  }

  const esTelefono = /^\d{3,}$/.test(q.replace(/\s/g, ""));
  return (
    <div className="space-y-3">
      <div className="relative">
        <Field label="Cliente" hint="Escribe nombre o celular. Si no existe, se crea con el pedido.">
          <input value={q} onChange={(e) => cambiar(e.target.value)} onFocus={() => res.length && setAbierto(true)} onBlur={() => setTimeout(() => setAbierto(false), 150)} placeholder="Nombre o celular" name="cliente_busqueda" autoComplete="off" />
        </Field>
        {abierto && res.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-line bg-white shadow-lg max-h-60 overflow-auto">
            {res.map((c) => (
              <li key={c.id}>
                <button type="button" onMouseDown={() => { setSel(c); setAbierto(false); }} className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
                  <span className="font-medium">{c.nombre}</span>{c.telefono && <span className="text-ink-soft"> · {c.telefono}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {q.trim().length >= 2 && (
        <div className="grid sm:grid-cols-2 gap-3 rounded-lg border border-dashed border-line p-3">
          <p className="sm:col-span-2 text-xs text-ink-soft">Cliente nuevo. Completa lo que tengas:</p>
          <Field label="Nombre"><input name="cliente_nombre" defaultValue={esTelefono ? "" : q} key={esTelefono ? "n" : q} required /></Field>
          <Field label="Celular"><input name="cliente_telefono" type="tel" defaultValue={esTelefono ? q : ""} key={esTelefono ? q : "t"} /></Field>
          <Field label="Correo"><input name="cliente_email" type="email" /></Field>
          <Field label="Dirección"><input name="cliente_direccion" /></Field>
        </div>
      )}
    </div>
  );
}
