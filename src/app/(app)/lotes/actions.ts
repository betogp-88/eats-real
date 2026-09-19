"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

function revalidar(id?: string) {
  revalidatePath("/lotes"); revalidatePath("/inventario"); revalidatePath("/");
  if (id) revalidatePath(`/lotes/${id}`);
}

function costosDe(fd: FormData) {
  const conceptos = fd.getAll("concepto").map(String);
  const montos = fd.getAll("monto").map(Number);
  return conceptos.map((concepto, i) => ({ concepto: concepto.trim(), monto: montos[i] || 0 })).filter((c) => c.concepto && c.monto > 0);
}

function loteDe(fd: FormData) {
  return {
    maquilador_id: String(fd.get("maquilador_id") ?? "") || null,
    fecha_produccion: String(fd.get("fecha_produccion") ?? ""),
    fecha_caducidad: String(fd.get("fecha_caducidad") ?? "") || null,
    bolsas_finales: Number(fd.get("bolsas_finales") ?? 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearLote(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const lote = {
    ...loteDe(fd),
    codigo: String(fd.get("codigo") ?? "").trim().toUpperCase(),
    producto_id: String(fd.get("producto_id") ?? ""),
  };
  if (!lote.codigo || !lote.producto_id) return { error: "Código y producto son obligatorios." };
  const recibido = fd.get("recibido") === "on";
  if (recibido && lote.bolsas_finales <= 0) return { error: "Para darlo de alta en almacén indica cuántas bolsas llegaron." };

  const { data, error } = await supabase.from("lotes").insert(lote).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un lote con ese código." : error.message };
  const costos = costosDe(fd);
  if (costos.length) await supabase.from("lote_costos").insert(costos.map((c) => ({ ...c, lote_id: data.id })));
  if (recibido) {
    const { error: e2 } = await supabase.rpc("recibir_lote", { p_lote: data.id });
    if (e2) { revalidar(); redirect(`/lotes/${data.id}?error=${encodeURIComponent("Lote creado, pero no se pudo dar entrada: " + e2.message)}`); }
  }
  revalidar();
  redirect(`/lotes/${data.id}?ok=${encodeURIComponent(recibido ? "Lote creado y en inventario" : "Lote creado en borrador")}`);
}

export async function actualizarLote(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const { data: actual } = await supabase.from("lotes").select("estado").eq("id", id).single();
  if (!actual || actual.estado === "cerrado") return { error: "El lote está cerrado y no se edita." };
  const datos = loteDe(fd);
  if (actual.estado === "recibido") delete (datos as Partial<typeof datos>).bolsas_finales;
  const { error } = await supabase.from("lotes").update(datos).eq("id", id);
  if (error) return { error: error.message };
  await supabase.from("lote_costos").delete().eq("lote_id", id);
  const costos = costosDe(fd);
  if (costos.length) await supabase.from("lote_costos").insert(costos.map((c) => ({ ...c, lote_id: id })));
  await supabase.rpc("recalcular_costo_lote", { p_lote: id });
  revalidar(id);
  return { ok: "Lote guardado." };
}

export async function recibirLote(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("recibir_lote", { p_lote: id });
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Lote recibido: ya está en inventario." };
}

export async function cerrarLote(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("lotes").update({ estado: "cerrado" }).eq("id", id).eq("estado", "recibido");
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Lote cerrado." };
}

export async function eliminarLote(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("lotes").delete().eq("id", id).eq("estado", "borrador");
  if (error) return { error: error.message };
  revalidar();
  redirect("/lotes?ok=Lote eliminado");
}

// ---- Maquiladores ----
export async function crearMaquilador(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("maquiladores").insert({ nombre, contacto: String(fd.get("contacto") ?? "").trim() || null });
  if (error) return { error: error.message };
  revalidatePath("/maquiladores"); revalidatePath("/lotes");
  return { ok: "Maquilador agregado." };
}

export async function actualizarMaquilador(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("maquiladores").update({ nombre, contacto: String(fd.get("contacto") ?? "").trim() || null, activo: fd.get("activo") === "on" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/maquiladores"); revalidatePath("/lotes");
  return { ok: "Guardado." };
}
