"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

export type ClienteBusqueda = { id: string; nombre: string; telefono: string | null; email: string | null; direccion: string | null };

/** Busca por nombre o teléfono (prefijo o contenido). */
export async function buscarClientes(q: string): Promise<ClienteBusqueda[]> {
  const supabase = await createClient();
  const t = q.trim();
  if (t.length < 2) return [];
  const digits = t.replace(/\D/g, "");
  let query = supabase.from("clientes").select("id, nombre, telefono, email, direccion").limit(8);
  query = digits.length >= 3 && digits.length === t.length
    ? query.ilike("telefono", `%${digits}%`)
    : query.or(`nombre.ilike.%${t}%,telefono.ilike.%${digits || t}%`);
  const { data } = await query.order("nombre");
  return data ?? [];
}

function clienteDe(fd: FormData) {
  return {
    nombre: String(fd.get("nombre") ?? "").trim(),
    telefono: String(fd.get("telefono") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    direccion: String(fd.get("direccion") ?? "").trim() || null,
    canal_origen: String(fd.get("canal_origen") ?? "").trim() || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearCliente(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const c = clienteDe(fd);
  if (!c.nombre) return { error: "El nombre es obligatorio." };
  const { data, error } = await supabase.from("clientes").insert(c).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}?ok=Cliente creado`);
}

export async function actualizarCliente(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const c = clienteDe(fd);
  if (!c.nombre) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("clientes").update(c).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  return { ok: "Datos guardados." };
}

export async function eliminarCliente(id: string): Promise<Result> {
  const supabase = await createClient();
  const { count } = await supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("cliente_id", id);
  if (count) return { error: `Tiene ${count} pedidos; no se puede eliminar.` };
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  redirect("/clientes?ok=Cliente eliminado");
}
