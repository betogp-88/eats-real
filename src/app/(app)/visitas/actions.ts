"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

export async function registrarVisita(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const pvId = String(fd.get("punto_venta_id") ?? "");
  if (!pvId) return { error: "Falta el punto de venta." };
  const productoIds = fd.getAll("producto_id").map(String);
  const lineas = productoIds.map((producto_id, i) => {
    const contadas = String(fd.getAll("contadas")[i] ?? "");
    const dejo = String(fd.getAll("dejo")[i] ?? "");
    const precio = String(fd.getAll("precio")[i] ?? "");
    return {
      producto_id,
      contadas: contadas === "" ? null : Number(contadas),
      dejo: dejo === "" ? 0 : Number(dejo),
      precio: precio === "" ? null : Number(precio),
    };
  }).filter((l) => l.contadas != null || l.dejo > 0);
  const resultado = String(fd.get("resultado") ?? "venta");
  const payload = {
    punto_venta_id: pvId,
    ruta_id: String(fd.get("ruta_id") ?? "") || null,
    resultado,
    notas: String(fd.get("notas") ?? "").trim() || null,
    fotos: fd.getAll("fotos").map(String).filter(Boolean),
    cobro_monto: Number(fd.get("cobro_monto") ?? 0) || 0,
    cobro_metodo: String(fd.get("cobro_metodo") ?? "") || null,
    lineas: resultado === "venta" ? lineas : [],
  };
  const { data, error } = await supabase.rpc("registrar_visita", { p: payload });
  if (error) return { error: error.message };
  ["/rutas", "/visitas", "/puntos-venta", "/pedidos", "/inventario", "/"].forEach((p) => revalidatePath(p));
  revalidatePath(`/puntos-venta/${pvId}`);
  redirect(`/visitas/${data}?ok=${encodeURIComponent("Visita registrada")}`);
}

export async function eliminarVisita(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: v } = await supabase.from("visitas").select("pedido_id, repuesto").eq("id", id).single();
  if (!v) return { error: "Visita no encontrada." };
  if (v.pedido_id || v.repuesto > 0) return { error: "Esta visita generó venta o reposición; cancela el pedido desde Pedidos en lugar de borrar la visita." };
  const { error } = await supabase.from("visitas").delete().eq("id", id);
  if (error) return { error: error.message };
  ["/rutas", "/visitas", "/puntos-venta"].forEach((p) => revalidatePath(p));
  return { ok: "Visita eliminada." };
}
