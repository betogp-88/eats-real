"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

function revalidar(id?: string) { ["/rutas", "/puntos-venta", "/"].forEach((p) => revalidatePath(p)); if (id) revalidatePath(`/rutas/${id}`); }

function rutaDe(fd: FormData) {
  const dia = String(fd.get("dia_semana") ?? "");
  return {
    nombre: String(fd.get("nombre") ?? "").trim(),
    dia_semana: dia === "" ? null : Number(dia),
    cada_semanas: Number(fd.get("cada_semanas") ?? 1) || 1,
    responsable_id: String(fd.get("responsable_id") ?? "") || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearRuta(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const r = rutaDe(fd);
  if (!r.nombre) return { error: "El nombre es obligatorio." };
  const { data, error } = await supabase.from("rutas").insert(r).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe una ruta con ese nombre." : error.message };
  revalidar();
  redirect(`/rutas/${data.id}?ok=Ruta creada`);
}

export async function actualizarRuta(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const r = rutaDe(fd);
  if (!r.nombre) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("rutas").update({ ...r, activo: fd.get("activo") !== "off" }).eq("id", id);
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Ruta guardada." };
}

export async function toggleRuta(id: string, activo: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("rutas").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: activo ? "Ruta activada." : "Ruta desactivada." };
}

/** Guarda el orden de visita: fd trae orden[<pv_id>] = n */
export async function guardarOrden(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const cambios: { id: string; orden: number }[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^orden\[(.+)\]$/.exec(k);
    if (m) cambios.push({ id: m[1], orden: Number(v) || 0 });
  }
  for (const c of cambios) {
    const { error } = await supabase.from("puntos_venta").update({ orden: c.orden }).eq("id", c.id);
    if (error) return { error: error.message };
  }
  revalidar(id);
  return { ok: "Orden guardado." };
}

/** Mueve tiendas a esta ruta: fd trae pv_ids (varios) */
export async function asignarTiendas(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const ids = fd.getAll("pv_ids").map(String).filter(Boolean);
  if (!ids.length) return { error: "Selecciona al menos una tienda." };
  const { error } = await supabase.from("puntos_venta").update({ ruta_id: id }).in("id", ids);
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: `${ids.length} tienda(s) agregadas a la ruta.` };
}

export async function quitarDeRuta(rutaId: string, pvId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("puntos_venta").update({ ruta_id: null, orden: null }).eq("id", pvId);
  if (error) return { error: error.message };
  revalidar(rutaId);
  return { ok: "Tienda quitada de la ruta." };
}
