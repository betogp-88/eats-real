"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/consejo";
import type { Result } from "@/components/ui/client";

function revalidar(id?: string) { ["/consejo", "/consejo/metas", "/"].forEach((p) => revalidatePath(p)); if (id) revalidatePath(`/consejo/juntas/${id}`); }

// ---- Metas ----
function metaDe(fd: FormData) {
  return {
    anio: Number(fd.get("anio")),
    tipo: String(fd.get("tipo") ?? "manual") === "ventas" ? "ventas" : "manual",
    nombre: String(fd.get("nombre") ?? "").trim(),
    descripcion: String(fd.get("descripcion") ?? "").trim() || null,
    valor_meta: Number(fd.get("valor_meta") ?? 0),
    unidad: String(fd.get("unidad") ?? "MXN").trim() || "MXN",
    responsable_id: String(fd.get("responsable_id") ?? "") || null,
    orden: Number(fd.get("orden") ?? 0) || 0,
  };
}
export async function crearMeta(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const m = metaDe(fd);
  if (!m.nombre || !m.anio) return { error: "Nombre y año son obligatorios." };
  if (m.tipo === "ventas") m.unidad = "MXN";
  const { error } = await supabase.from("metas").insert(m);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Meta creada." };
}
export async function actualizarMeta(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const m = metaDe(fd);
  if (!m.nombre) return { error: "El nombre es obligatorio." };
  if (m.tipo === "ventas") m.unidad = "MXN";
  const { error } = await supabase.from("metas").update(m).eq("id", id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Meta guardada." };
}
export async function eliminarMeta(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("metas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Meta eliminada." };
}
/** Avances de metas manuales de un mes: fd trae avance[<meta_id>] */
export async function guardarAvances(mes: string, juntaId: string | null, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const filas: { meta_id: string; mes: string; valor: number; nota: string | null }[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^avance\[(.+)\]$/.exec(k);
    if (m && String(v).trim() !== "") filas.push({ meta_id: m[1], mes: `${mes}-01`, valor: Number(v), nota: String(fd.get(`nota[${m[1]}]`) ?? "").trim() || null });
  }
  if (!filas.length) return { error: "No hay avances que guardar." };
  const { error } = await supabase.from("metas_avances").upsert(filas, { onConflict: "meta_id,mes" });
  if (error) return { error: error.message };
  revalidar(juntaId ?? undefined);
  return { ok: "Avances guardados." };
}

// ---- Juntas ----
export async function prepararJunta(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const mes = String(fd.get("mes") ?? "");
  if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Mes inválido." };
  const { data: { user } } = await supabase.auth.getUser();
  const { data: existe } = await supabase.from("juntas").select("id").eq("mes", `${mes}-01`).maybeSingle();
  if (existe) redirect(`/consejo/juntas/${existe.id}`);
  const { data, error } = await supabase.from("juntas").insert({ mes: `${mes}-01`, creado_por: user?.id ?? null }).select("id").single();
  if (error) return { error: error.message };
  revalidar();
  redirect(`/consejo/juntas/${data.id}?ok=${encodeURIComponent("Junta preparada. Llena la minuta por área.")}`);
}
export async function guardarMinuta(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const minuta: Record<string, string> = {};
  for (const a of AREAS) minuta[a.key] = String(fd.get(`minuta[${a.key}]`) ?? "").trim();
  const { error } = await supabase.from("juntas").update({
    minuta,
    fecha: String(fd.get("fecha") ?? "") ? new Date(String(fd.get("fecha"))).toISOString() : null,
    asistentes: String(fd.get("asistentes") ?? "").trim() || null,
    acuerdos: String(fd.get("acuerdos") ?? "").trim() || null,
  }).eq("id", id).eq("estado", "borrador");
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Minuta guardada." };
}
export async function cerrarJunta(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("juntas").update({ estado: "cerrada", cerrada_en: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Junta cerrada. Ya no se edita la minuta." };
}
export async function reabrirJunta(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("juntas").update({ estado: "borrador", cerrada_en: null }).eq("id", id);
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Junta reabierta." };
}
export async function eliminarJunta(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("juntas").delete().eq("id", id).eq("estado", "borrador");
  if (error) return { error: error.message };
  revalidar();
  redirect("/consejo?ok=Junta eliminada");
}

// ---- Compromisos ----
export async function crearCompromiso(juntaId: string | null, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const descripcion = String(fd.get("descripcion") ?? "").trim();
  if (!descripcion) return { error: "Escribe el compromiso." };
  const { error } = await supabase.from("compromisos").insert({
    junta_id: juntaId, descripcion, area: String(fd.get("area") ?? "") || null,
    responsable_id: String(fd.get("responsable_id") ?? "") || null, fecha_limite: String(fd.get("fecha_limite") ?? "") || null,
  });
  if (error) return { error: error.message };
  revalidar(juntaId ?? undefined);
  return { ok: "Compromiso agregado." };
}
export async function estadoCompromiso(id: string, estado: "pendiente" | "hecho" | "cancelado", juntaId?: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("compromisos").update({ estado, completado_en: estado === "hecho" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { error: error.message };
  revalidar(juntaId);
  return { ok: estado === "hecho" ? "Compromiso cumplido." : estado === "cancelado" ? "Compromiso cancelado." : "Compromiso reabierto." };
}
export async function eliminarCompromiso(id: string, juntaId?: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("compromisos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidar(juntaId);
  return { ok: "Compromiso eliminado." };
}
