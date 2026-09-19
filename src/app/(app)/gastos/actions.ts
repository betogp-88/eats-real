"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

function revalidar() { ["/gastos", "/resultados", "/"].forEach((p) => revalidatePath(p)); }

export async function crearGasto(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const monto = Number(fd.get("monto") ?? 0);
  if (!(monto > 0)) return { error: "Indica el monto." };
  const { error } = await supabase.from("gastos").insert({
    fecha: String(fd.get("fecha")), categoria: String(fd.get("categoria")),
    proveedor: String(fd.get("proveedor") ?? "").trim() || null, monto, nota: String(fd.get("nota") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Gasto registrado." };
}

export async function eliminarGasto(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Gasto eliminado." };
}

export async function crearGastoMarketing(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const monto = Number(fd.get("monto") ?? 0);
  if (!(monto > 0)) return { error: "Indica el monto." };
  const { error } = await supabase.from("gastos_marketing").insert({
    fecha_inicio: String(fd.get("fecha_inicio")), fecha_fin: String(fd.get("fecha_fin")), canal: String(fd.get("canal")),
    campana: String(fd.get("campana") ?? "").trim() || null, monto, nota: String(fd.get("nota") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Inversión registrada." };
}

export async function eliminarGastoMarketing(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("gastos_marketing").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidar();
  return { ok: "Registro eliminado." };
}
