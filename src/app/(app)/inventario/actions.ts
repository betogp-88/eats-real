"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; ok?: string } | undefined;

export async function trasladar(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("trasladar_inventario", {
    p_lote: String(fd.get("lote_id")),
    p_origen: String(fd.get("origen_id")),
    p_destino: String(fd.get("destino_id")),
    p_cantidad: Number(fd.get("cantidad")),
    p_nota: String(fd.get("nota") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/inventario");
  return { ok: "Traslado registrado." };
}

export async function ajustar(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const loteId = String(fd.get("lote_id"));
  const cantidad = Number(fd.get("cantidad"));
  const tipo = String(fd.get("tipo")) === "merma" ? "merma" : "ajuste";
  if (!cantidad) return { error: "Indica una cantidad distinta de cero." };
  const { data: lote } = await supabase.from("lotes").select("producto_id").eq("id", loteId).single();
  if (!lote) return { error: "Lote no encontrado." };
  const { error } = await supabase.from("movimientos_inv").insert({
    tipo,
    producto_id: lote.producto_id,
    lote_id: loteId,
    ubicacion_id: String(fd.get("ubicacion_id")),
    cantidad: tipo === "merma" ? -Math.abs(cantidad) : cantidad,
    nota: String(fd.get("nota") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/inventario");
  return { ok: "Movimiento registrado." };
}
