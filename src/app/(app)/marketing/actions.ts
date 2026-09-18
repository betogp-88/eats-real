"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function crearGastoMarketing(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("gastos_marketing").insert({
    fecha_inicio: String(fd.get("fecha_inicio")),
    fecha_fin: String(fd.get("fecha_fin")),
    canal: String(fd.get("canal")),
    campana: String(fd.get("campana") ?? "").trim() || null,
    monto: Number(fd.get("monto") ?? 0),
    nota: String(fd.get("nota") ?? "").trim() || null,
  });
  revalidatePath("/marketing");
  revalidatePath("/resultados");
}

export async function eliminarGastoMarketing(id: string) {
  const supabase = await createClient();
  await supabase.from("gastos_marketing").delete().eq("id", id);
  revalidatePath("/marketing");
  revalidatePath("/resultados");
}
