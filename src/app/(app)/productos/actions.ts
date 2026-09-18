"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string } | undefined;

function productoDe(fd: FormData) {
  return {
    sku: String(fd.get("sku") ?? "").trim().toUpperCase(),
    nombre: String(fd.get("nombre") ?? "").trim(),
    presentacion: String(fd.get("presentacion") ?? "").trim() || null,
    precio_lista: Number(fd.get("precio_lista") ?? 0),
    shopify_sku: String(fd.get("shopify_sku") ?? "").trim() || null,
    amazon_sku: String(fd.get("amazon_sku") ?? "").trim() || null,
    color: String(fd.get("color") ?? "").trim() || null,
    activo: fd.get("activo") === "on",
  };
}

export async function crearProducto(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const p = productoDe(fd);
  if (!p.sku || !p.nombre) return { error: "SKU y nombre son obligatorios." };
  const { error } = await supabase.from("productos").insert(p);
  if (error) return { error: error.message };
  revalidatePath("/productos");
  redirect("/productos");
}

export async function actualizarProducto(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const p = productoDe(fd);
  if (!p.sku || !p.nombre) return { error: "SKU y nombre son obligatorios." };
  const { error } = await supabase.from("productos").update(p).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/productos");
  redirect("/productos");
}

export async function crearMaquilador(fd: FormData) {
  const supabase = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return;
  await supabase.from("maquiladores").insert({ nombre, contacto: String(fd.get("contacto") ?? "").trim() || null });
  revalidatePath("/productos");
}

export async function crearUbicacion(fd: FormData) {
  const supabase = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const tipo = String(fd.get("tipo") ?? "consignacion");
  if (!nombre) return;
  await supabase.from("ubicaciones").insert({ nombre, tipo });
  revalidatePath("/productos");
  revalidatePath("/inventario");
}

export async function toggleActivo(tabla: "maquiladores" | "ubicaciones", id: string, activo: boolean) {
  const supabase = await createClient();
  await supabase.from(tabla).update({ activo }).eq("id", id);
  revalidatePath("/productos");
}
