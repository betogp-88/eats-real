"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { empresa } from "@/lib/empresa";
import type { Result } from "@/components/ui/client";

export async function agregarUsuario(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const rol = String(fd.get("rol") ?? "rutas");
  if (!email) return { error: "Escribe el correo." };
  const { data: perfil } = await supabase.schema("public").from("perfiles").select("id").ilike("email", email).maybeSingle();
  if (!perfil) return { error: "Ese correo no existe como usuario. Primero créalo en Supabase → Authentication → Users." };
  const { error } = await supabase.schema("public").from("membresias").upsert({ user_id: perfil.id, empresa: empresa.slug, rol }, { onConflict: "user_id,empresa" });
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: "Usuario agregado." };
}

export async function cambiarRol(userId: string, rol: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId && rol !== "admin") return { error: "No puedes quitarte a ti mismo el rol de administrador." };
  const { error } = await supabase.schema("public").from("membresias").update({ rol }).eq("user_id", userId).eq("empresa", empresa.slug);
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: "Rol actualizado." };
}

export async function quitarUsuario(userId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId) return { error: "No puedes quitarte a ti mismo." };
  const { error } = await supabase.schema("public").from("membresias").delete().eq("user_id", userId).eq("empresa", empresa.slug);
  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { ok: "Acceso retirado." };
}
