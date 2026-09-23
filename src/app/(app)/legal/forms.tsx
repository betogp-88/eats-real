"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/client";
import { Field, Alert } from "@/components/ui";
import { SelectBuscable } from "@/components/ui/select-buscable";
import { crearDocumento, guardarDatosEmpresa, crearCuenta } from "./actions";
import { CLAVES_EMPRESA, CATEGORIAS } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";
import { empresa } from "@/lib/empresa";


export function DocumentoForm({ categoriaInicial, puntosVenta }: { categoriaInicial: string; puntosVenta: { id: string; nombre: string }[] }) {
  const [categoria, setCategoria] = useState(categoriaInicial === "todos" ? "contrato" : categoriaInicial);
  const [archivo, setArchivo] = useState<{ path: string; nombre: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function subir(f: File | undefined) {
    if (!f) return;
    setSubiendo(true); setErr(null);
    const supabase = createClient();
    const limpio = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_");
    const path = `${empresa.slug}/${categoria}/${Date.now()}-${limpio}`;
    const { error } = await supabase.storage.from("legal").upload(path, f, { contentType: f.type || undefined });
    if (error) setErr(`No se pudo subir: ${error.message}`); else setArchivo({ path, nombre: f.name });
    setSubiendo(false);
  }

  return (
    <ActionForm action={crearDocumento} submit={subiendo ? "Subiendo…" : "Guardar documento"} variant="accent">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Categoría"><select name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>{CATEGORIAS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
        <Field label="Título"><input name="titulo" required placeholder={categoria === "contrato" ? "Contrato de consignación" : "Nombre del documento"} /></Field>
        {categoria === "contrato" && (
          <>
            <Field label="Contraparte" hint="Con quién es el contrato"><input name="contraparte" placeholder="Retailer, tienda, proveedor" /></Field>
            <Field label="Punto de venta (si aplica)"><SelectBuscable name="punto_venta_id" opciones={puntosVenta.map((p) => ({ id: p.id, label: p.nombre }))} placeholder="Escribe la tienda" /></Field>
          </>
        )}
        <Field label="Fecha del documento"><input name="fecha_documento" type="date" /></Field>
        <Field label="Vigente hasta" hint="Para contratos y permisos; avisa al acercarse"><input name="vigencia_hasta" type="date" /></Field>
        <Field label="Descripción" className="sm:col-span-2"><input name="descripcion" placeholder="Notas, cláusulas importantes, folios" /></Field>
        <Field label="Archivo (PDF, imagen, Word…)" className="sm:col-span-2">
          <input type="file" onChange={(e) => subir(e.target.files?.[0])} disabled={subiendo} className="text-sm" />
          {archivo && <p className="text-xs text-brand mt-1">Listo: {archivo.nombre}</p>}
          {err && <Alert>{err}</Alert>}
          <input type="hidden" name="archivo" value={archivo?.path ?? ""} />
          <input type="hidden" name="archivo_nombre" value={archivo?.nombre ?? ""} />
        </Field>
      </div>
    </ActionForm>
  );
}

export function DatosEmpresaForm({ valores }: { valores: Record<string, string | null> }) {
  return (
    <ActionForm action={guardarDatosEmpresa} submit="Guardar datos" variant="secondary">
      <div className="grid sm:grid-cols-2 gap-3">
        {CLAVES_EMPRESA.map(([clave, label]) => (
          <Field key={clave} label={label} className={clave === "domicilio_fiscal" || clave === "notaria" ? "sm:col-span-2" : ""}><input name={clave} defaultValue={valores[clave] ?? ""} /></Field>
        ))}
      </div>
    </ActionForm>
  );
}

export function CuentaForm() {
  return (
    <ActionForm action={crearCuenta} submit="Agregar cuenta" variant="secondary">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Banco"><input name="banco" required /></Field>
        <Field label="Titular"><input name="titular" /></Field>
        <Field label="CLABE"><input name="clabe" inputMode="numeric" maxLength={18} /></Field>
        <Field label="Número de cuenta"><input name="cuenta" /></Field>
        <Field label="Uso" className="sm:col-span-2"><input name="uso" placeholder="Operación, nómina, cobros de tiendas…" /></Field>
      </div>
    </ActionForm>
  );
}
