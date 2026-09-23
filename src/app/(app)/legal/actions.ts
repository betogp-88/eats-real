"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";
import { CLAVES_EMPRESA } from "@/lib/legal";

export async function crearDocumento(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const titulo = String(fd.get("titulo") ?? "").trim();
  if (!titulo) return { error: "Escribe el título del documento." };
  const { error } = await supabase.from("documentos_legales").insert({
    categoria: String(fd.get("categoria") ?? "otro"),
    titulo,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    archivo: String(fd.get("archivo") ?? "") || null,
    archivo_nombre: String(fd.get("archivo_nombre") ?? "") || null,
    contraparte: String(fd.get("contraparte") ?? "").trim() || null,
    punto_venta_id: String(fd.get("punto_venta_id") ?? "") || null,
    fecha_documento: String(fd.get("fecha_documento") ?? "") || null,
    vigencia_hasta: String(fd.get("vigencia_hasta") ?? "") || null,
    creado_por: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/legal");
  return { ok: "Documento guardado." };
}

export async function eliminarDocumento(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: d } = await supabase.from("documentos_legales").select("archivo").eq("id", id).single();
  if (d?.archivo) await supabase.storage.from("legal").remove([d.archivo]);
  const { error } = await supabase.from("documentos_legales").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/legal");
  return { ok: "Documento eliminado." };
}


export async function guardarDatosEmpresa(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const filas = CLAVES_EMPRESA.map(([clave]) => ({ clave, valor: String(fd.get(clave) ?? "").trim() || null, actualizado_en: new Date().toISOString() }));
  const { error } = await supabase.from("datos_empresa").upsert(filas, { onConflict: "clave" });
  if (error) return { error: error.message };
  revalidatePath("/legal");
  return { ok: "Datos guardados." };
}

export async function crearCuenta(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const banco = String(fd.get("banco") ?? "").trim();
  if (!banco) return { error: "Indica el banco." };
  const { error } = await supabase.from("cuentas_bancarias").insert({
    banco, titular: String(fd.get("titular") ?? "").trim() || null, clabe: String(fd.get("clabe") ?? "").replace(/\s/g, "") || null,
    cuenta: String(fd.get("cuenta") ?? "").trim() || null, uso: String(fd.get("uso") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/legal");
  return { ok: "Cuenta agregada." };
}

export async function eliminarCuenta(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("cuentas_bancarias").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/legal");
  return { ok: "Cuenta eliminada." };
}
