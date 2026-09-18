"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string } | undefined;

export async function crearLote(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const lote = {
    codigo: String(fd.get("codigo") ?? "").trim().toUpperCase(),
    producto_id: String(fd.get("producto_id") ?? ""),
    maquilador_id: String(fd.get("maquilador_id") ?? "") || null,
    fecha_produccion: String(fd.get("fecha_produccion") ?? ""),
    fecha_caducidad: String(fd.get("fecha_caducidad") ?? "") || null,
    bolsas_finales: Number(fd.get("bolsas_finales") ?? 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
  if (!lote.codigo || !lote.producto_id) return { error: "Código y producto son obligatorios." };
  const { data, error } = await supabase.from("lotes").insert(lote).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/lotes");
  redirect(`/lotes/${data.id}`);
}

export async function actualizarLote(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("lotes").update({
    maquilador_id: String(fd.get("maquilador_id") ?? "") || null,
    fecha_produccion: String(fd.get("fecha_produccion") ?? ""),
    fecha_caducidad: String(fd.get("fecha_caducidad") ?? "") || null,
    bolsas_finales: Number(fd.get("bolsas_finales") ?? 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/lotes/${id}`);
  return {};
}

export async function agregarCosto(loteId: string, fd: FormData) {
  const supabase = await createClient();
  const concepto = String(fd.get("concepto") ?? "").trim();
  const monto = Number(fd.get("monto") ?? 0);
  if (!concepto || !(monto > 0)) return;
  await supabase.from("lote_costos").insert({ lote_id: loteId, concepto, monto });
  revalidatePath(`/lotes/${loteId}`);
}

export async function eliminarCosto(loteId: string, costoId: string) {
  const supabase = await createClient();
  await supabase.from("lote_costos").delete().eq("id", costoId);
  revalidatePath(`/lotes/${loteId}`);
}

export async function recibirLote(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("recibir_lote", { p_lote: id });
  if (error) return { error: error.message };
  revalidatePath(`/lotes/${id}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return {};
}

export async function cerrarLote(id: string) {
  const supabase = await createClient();
  await supabase.from("lotes").update({ estado: "cerrado" }).eq("id", id).eq("estado", "recibido");
  revalidatePath(`/lotes/${id}`);
  revalidatePath("/lotes");
}

export async function eliminarLote(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("lotes").delete().eq("id", id).eq("estado", "borrador");
  if (error) return { error: error.message };
  revalidatePath("/lotes");
  redirect("/lotes");
}
