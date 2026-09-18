"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function crearGasto(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("gastos").insert({
    fecha: String(fd.get("fecha")),
    categoria: String(fd.get("categoria")),
    proveedor: String(fd.get("proveedor") ?? "").trim() || null,
    monto: Number(fd.get("monto") ?? 0),
    nota: String(fd.get("nota") ?? "").trim() || null,
  });
  revalidatePath("/gastos");
  revalidatePath("/resultados");
}

export async function eliminarGasto(id: string) {
  const supabase = await createClient();
  await supabase.from("gastos").delete().eq("id", id);
  revalidatePath("/gastos");
  revalidatePath("/resultados");
}
