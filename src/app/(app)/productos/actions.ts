"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";

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
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un producto con ese SKU." : error.message };
  revalidatePath("/productos");
  redirect("/productos?ok=Producto creado");
}

export async function actualizarProducto(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const p = productoDe(fd);
  if (!p.sku || !p.nombre) return { error: "SKU y nombre son obligatorios." };
  const { error } = await supabase.from("productos").update(p).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/productos");
  redirect("/productos?ok=Producto guardado");
}

export async function crearUbicacion(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("ubicaciones").insert({ nombre, tipo: String(fd.get("tipo") ?? "almacen") });
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe una ubicación con ese nombre." : error.message };
  revalidatePath("/productos"); revalidatePath("/inventario");
  return { ok: "Ubicación agregada." };
}

export async function toggleUbicacion(id: string, activo: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("ubicaciones").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/productos"); revalidatePath("/inventario");
  return { ok: activo ? "Ubicación activada." : "Ubicación desactivada." };
}
