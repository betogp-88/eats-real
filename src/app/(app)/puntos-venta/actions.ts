"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

function datosDe(fd: FormData) {
  return {
    nombre: String(fd.get("nombre") ?? "").trim(),
    contacto: String(fd.get("contacto") ?? "").trim() || null,
    telefono: String(fd.get("telefono") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    direccion: String(fd.get("direccion") ?? "").trim() || null,
    modalidad: String(fd.get("modalidad") ?? "consignacion"),
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearPuntoVenta(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const d = datosDe(fd);
  if (!d.nombre) return { error: "El nombre es obligatorio." };
  const { data, error } = await supabase.rpc("crear_punto_venta", { p_datos: d });
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un punto de venta con ese nombre." : error.message };
  revalidatePath("/puntos-venta");
  revalidatePath("/inventario");
  redirect(`/puntos-venta/${data}?ok=Punto de venta creado`);
}

export async function actualizarPuntoVenta(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const d = datosDe(fd);
  if (!d.nombre) return { error: "El nombre es obligatorio." };
  const { data: actual } = await supabase.from("puntos_venta").select("modalidad, ubicacion_id").eq("id", id).single();
  let ubicacion_id = actual?.ubicacion_id ?? null;
  if (d.modalidad === "consignacion" && !ubicacion_id) {
    const { data: u, error: eu } = await supabase.from("ubicaciones").upsert({ nombre: d.nombre, tipo: "consignacion", activo: true }, { onConflict: "nombre" }).select("id").single();
    if (eu) return { error: eu.message };
    ubicacion_id = u.id;
  }
  const { error } = await supabase.from("puntos_venta").update({ ...d, ubicacion_id, activo: fd.get("activo") !== "off" }).eq("id", id);
  if (error) return { error: error.message };
  if (ubicacion_id) await supabase.from("ubicaciones").update({ nombre: d.nombre }).eq("id", ubicacion_id);
  revalidatePath(`/puntos-venta/${id}`);
  revalidatePath("/puntos-venta");
  return { ok: "Datos guardados." };
}

export async function toggleActivoPuntoVenta(id: string, activo: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("puntos_venta").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/puntos-venta/${id}`);
  revalidatePath("/puntos-venta");
  return { ok: activo ? "Punto de venta activado." : "Punto de venta desactivado." };
}
