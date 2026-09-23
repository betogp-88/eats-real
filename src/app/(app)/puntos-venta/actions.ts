"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/components/ui/client";
import { parseCsv } from "@/lib/csv";

function datosDe(fd: FormData) {
  return {
    nombre: String(fd.get("nombre") ?? "").trim(),
    contacto: String(fd.get("contacto") ?? "").trim() || null,
    telefono: String(fd.get("telefono") ?? "").trim() || null,
    email: String(fd.get("email") ?? "").trim() || null,
    direccion: String(fd.get("direccion") ?? "").trim() || null,
    modalidad: String(fd.get("modalidad") ?? "consignacion"),
    ruta_id: String(fd.get("ruta_id") ?? "") || null,
    orden: Number(fd.get("orden") ?? "") || null,
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
}

export async function crearPuntoVenta(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const d = datosDe(fd);
  if (!d.nombre) return { error: "El nombre es obligatorio." };
  const { data, error } = await supabase.rpc("crear_punto_venta", { p_datos: d });
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un punto de venta con ese nombre." : error.message };
  revalidatePath("/puntos-venta");
  revalidatePath("/inventario");
  redirect(`/puntos-venta/${data}?ok=Punto de venta creado`);
}

export async function actualizarPuntoVenta(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const d = datosDe(fd);
  if (!d.nombre) return { error: "El nombre es obligatorio." };
  const { data: actual } = await supabase.from("puntos_venta").select("modalidad, ubicacion_id").eq("id", id).single();
  let ubicacion_id = actual?.ubicacion_id ?? null;
  if (d.modalidad === "consignacion" && !ubicacion_id) {
    const { data: u, error: eu } = await supabase.from("ubicaciones").upsert({ nombre: d.nombre, tipo: "consignacion", activo: true }, { onConflict: "nombre" }).select("id").single();
    if (eu) return { error: eu.message };
    ubicacion_id = u.id;
  }
  const { error } = await supabase.from("puntos_venta").update({ ...d, ubicacion_id, activo: fd.get("activo") !== "off" }).eq("id", id);
  if (error) return { error: error.message };
  if (ubicacion_id) await supabase.from("ubicaciones").update({ nombre: d.nombre }).eq("id", ubicacion_id);
  revalidatePath(`/puntos-venta/${id}`);
  revalidatePath("/puntos-venta");
  return { ok: "Datos guardados." };
}

export async function toggleActivoPuntoVenta(id: string, activo: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("puntos_venta").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/puntos-venta/${id}`);
  revalidatePath("/puntos-venta");
  return { ok: activo ? "Punto de venta activado." : "Punto de venta desactivado." };
}

export async function importarPuntosVenta(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const file = fd.get("archivo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona el archivo." };
  const filas = parseCsv(await file.text());
  if (!filas.length) return { error: "El archivo está vacío o no tiene encabezados." };
  if (!("nombre" in filas[0])) return { error: "Falta la columna «nombre»." };

  const [{ data: existentes }, { data: rutas }] = await Promise.all([
    supabase.from("puntos_venta").select("nombre").limit(5000),
    supabase.from("rutas").select("id, nombre"),
  ]);
  const ya = new Set((existentes ?? []).map((e) => e.nombre.trim().toLowerCase()));
  const rutaId = new Map((rutas ?? []).map((r) => [r.nombre.trim().toLowerCase(), r.id]));
  let nuevos = 0, omitidos = 0; const errores: string[] = [];

  for (const f of filas) {
    const nombre = (f.nombre ?? "").trim();
    if (!nombre) continue;
    if (ya.has(nombre.toLowerCase())) { omitidos++; continue; }
    let ruta_id: string | null = null;
    const rutaNombre = (f.ruta ?? "").trim();
    if (rutaNombre) {
      ruta_id = rutaId.get(rutaNombre.toLowerCase()) ?? null;
      if (!ruta_id) {
        const { data: r, error } = await supabase.from("rutas").insert({ nombre: rutaNombre }).select("id").single();
        if (error) { errores.push(`Ruta ${rutaNombre}: ${error.message}`); } else { ruta_id = r.id; rutaId.set(rutaNombre.toLowerCase(), r.id); }
      }
    }
    const modalidad = (f.modalidad ?? "").trim().toLowerCase().startsWith("dir") ? "directa" : "consignacion";
    const { error } = await supabase.rpc("crear_punto_venta", { p_datos: {
      nombre, modalidad, ruta_id, orden: f.orden ? Number(f.orden) || null : null,
      contacto: f.contacto || null, telefono: f.telefono || null, email: f.email || null, direccion: f.direccion || null, notas: f.notas || null,
    } });
    if (error) errores.push(`${nombre}: ${error.message}`); else { nuevos++; ya.add(nombre.toLowerCase()); }
  }
  ["/puntos-venta", "/rutas", "/inventario"].forEach((p) => revalidatePath(p));
  return { ok: `Importadas ${nuevos} tiendas (${omitidos} ya existían).${errores.length ? ` Errores: ${errores.slice(0, 5).join(" · ")}` : ""}` };
}
