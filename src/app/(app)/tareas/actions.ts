"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

function revalidar() { ["/tareas", "/"].forEach((p) => revalidatePath(p)); }

async function usuarioActual() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function crearTarea(_p: Result, fd: FormData): Promise<Result> {
  const { supabase, user } = await usuarioActual();
  if (!user) return { error: "Sesión no válida." };
  const titulo = String(fd.get("titulo") ?? "").trim();
  if (!titulo) return { error: "Escribe el título de la tarea." };
  const { error } = await supabase.from("tareas").insert({
    titulo,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    creado_por: user.id,
    asignado_a: String(fd.get("asignado_a") ?? "") || user.id,
    prioridad: String(fd.get("prioridad") ?? "media"),
    fecha_limite: String(fd.get("fecha_limite") ?? "") || null,
  });
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Tarea creada." };
}

export async function actualizarTarea(id: string, _p: Result, fd: FormData): Promise<Result> {
  const { supabase } = await usuarioActual();
  const titulo = String(fd.get("titulo") ?? "").trim();
  if (!titulo) return { error: "Escribe el título de la tarea." };
  const { error } = await supabase.from("tareas").update({
    titulo,
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    asignado_a: String(fd.get("asignado_a") ?? "") || null,
    prioridad: String(fd.get("prioridad") ?? "media"),
    fecha_limite: String(fd.get("fecha_limite") ?? "") || null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Tarea guardada." };
}

export async function marcarTarea(id: string, hecha: boolean): Promise<Result> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("tareas").update({ estado: hecha ? "hecha" : "pendiente", completada_en: hecha ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: hecha ? "Tarea completada." : "Tarea reabierta." };
}

export async function eliminarTarea(id: string): Promise<Result> {
  const { supabase } = await usuarioActual();
  const { error } = await supabase.from("tareas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Tarea eliminada." };
}

export async function actualizarMiNombre(_p: Result, fd: FormData): Promise<Result> {
  const { supabase, user } = await usuarioActual();
  if (!user) return { error: "Sesión no válida." };
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribe tu nombre." };
  const { error } = await supabase.schema("public").from("perfiles").update({ nombre }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Nombre guardado." };
}
