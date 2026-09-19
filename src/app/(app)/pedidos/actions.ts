"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAmazonReport } from "@/lib/amazon";
import { sugerirDespacho, asignacionesDe, type Asignacion } from "@/lib/fifo";
import type { Result } from "@/components/ui/client";

function revalidar(id?: string) {
  ["/pedidos", "/inventario", "/resultados", "/", "/clientes", "/puntos-venta"].forEach((p) => revalidatePath(p));
  if (id) revalidatePath(`/pedidos/${id}`);
}

async function despacharFifo(supabase: Awaited<ReturnType<typeof createClient>>, pedidoId: string): Promise<string | null> {
  const { data: pedido } = await supabase.from("pedidos").select("ubicacion_id, pedido_lineas(id, producto_id, cantidad)").eq("id", pedidoId).single();
  if (!pedido) return "Pedido no encontrado.";
  const lineas = await sugerirDespacho(supabase, pedido.pedido_lineas as unknown as { id: string; producto_id: string; cantidad: number }[], pedido.ubicacion_id);
  const asignaciones = asignacionesDe(lineas);
  if (!asignaciones) return "No hay existencias suficientes para despachar completo; el pedido quedó pendiente.";
  const { error } = await supabase.rpc("despachar_pedido", { p_pedido: pedidoId, p_asignaciones: asignaciones });
  return error ? error.message : null;
}

export async function crearPedido(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const productoIds = fd.getAll("producto_id").map(String);
  const cantidades = fd.getAll("cantidad").map(Number);
  const precios = fd.getAll("precio_unitario").map(Number);
  const lineas = productoIds
    .map((producto_id, i) => ({ producto_id, cantidad: cantidades[i], precio_unitario: precios[i] }))
    .filter((l) => l.producto_id && l.cantidad > 0);
  if (!lineas.length) return { error: "Agrega al menos un producto con cantidad." };

  const canal = String(fd.get("canal"));
  let cliente_id = String(fd.get("cliente_id") ?? "") || null;
  let punto_venta_id: string | null = null;
  let ubicacion_id: string | null = null;
  let cliente_nombre = String(fd.get("cliente_nombre_libre") ?? "").trim() || null;

  if (canal === "punto_venta") {
    punto_venta_id = String(fd.get("punto_venta_id") ?? "") || null;
    if (!punto_venta_id) return { error: "Selecciona el punto de venta." };
    const { data: pv } = await supabase.from("puntos_venta").select("nombre, modalidad, ubicacion_id").eq("id", punto_venta_id).single();
    if (!pv) return { error: "Punto de venta no encontrado." };
    ubicacion_id = pv.modalidad === "consignacion" ? pv.ubicacion_id : null;
    cliente_nombre = pv.nombre;
  } else if (!cliente_id) {
    // Cliente nuevo capturado en el formulario
    const nombre = String(fd.get("cliente_nombre") ?? "").trim();
    if (nombre) {
      const { data: c, error } = await supabase.from("clientes").insert({
        nombre,
        telefono: String(fd.get("cliente_telefono") ?? "").trim() || null,
        email: String(fd.get("cliente_email") ?? "").trim() || null,
        direccion: String(fd.get("cliente_direccion") ?? "").trim() || null,
        canal_origen: canal,
      }).select("id").single();
      if (error) return { error: error.message };
      cliente_id = c.id;
    }
  }
  if (cliente_id) {
    const { data: c } = await supabase.from("clientes").select("nombre, email").eq("id", cliente_id).single();
    cliente_nombre = c?.nombre ?? cliente_nombre;
  }

  const pedido = {
    canal, cliente_id, punto_venta_id, ubicacion_id,
    ref_externa: String(fd.get("ref_externa") ?? "").trim() || null,
    fecha: String(fd.get("fecha")),
    cliente_nombre,
    descuento: Number(fd.get("descuento") ?? 0),
    envio_cobrado: Number(fd.get("envio_cobrado") ?? 0),
    comision_plataforma: Number(fd.get("comision_plataforma") ?? 0),
    costo_envio: Number(fd.get("costo_envio") ?? 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
  const { data, error } = await supabase.from("pedidos").insert(pedido).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "Ya existe un pedido con esa referencia en ese canal." : error.message };
  const { error: e2 } = await supabase.from("pedido_lineas").insert(lineas.map((l) => ({ ...l, pedido_id: data.id })));
  if (e2) { await supabase.from("pedidos").delete().eq("id", data.id); return { error: e2.message }; }

  if (fd.get("accion") === "despachar") {
    const err = await despacharFifo(supabase, data.id);
    revalidar();
    redirect(`/pedidos/${data.id}?${err ? `error=${encodeURIComponent(err)}` : "ok=Pedido guardado y despachado"}`);
  }
  revalidar();
  redirect(`/pedidos/${data.id}?ok=Pedido guardado`);
}

export async function actualizarCargos(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").update({
    descuento: Number(fd.get("descuento") ?? 0),
    envio_cobrado: Number(fd.get("envio_cobrado") ?? 0),
    comision_plataforma: Number(fd.get("comision_plataforma") ?? 0),
    costo_envio: Number(fd.get("costo_envio") ?? 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Cargos guardados." };
}

export async function despachar(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const asignaciones: Asignacion[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^asig\[(.+)\]\[(.+)\]$/.exec(k);
    if (m && Number(v) > 0) asignaciones.push({ linea_id: m[1], lote_id: m[2], cantidad: Number(v) });
  }
  if (!asignaciones.length) return { error: "Asigna al menos un lote." };
  const { error } = await supabase.rpc("despachar_pedido", { p_pedido: id, p_asignaciones: asignaciones });
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Pedido despachado." };
}

export async function cancelarPedido(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_pedido", { p_pedido: id });
  if (error) return { error: error.message };
  revalidar(id);
  return { ok: "Pedido cancelado." };
}

export async function eliminarPedido(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").delete().eq("id", id).eq("estado", "pendiente");
  if (error) return { error: error.message };
  revalidar();
  redirect("/pedidos?ok=Pedido eliminado");
}

export async function importarAmazon(_p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const file = fd.get("archivo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona el archivo del reporte." };
  const texto = await file.text();
  const { data: productos } = await supabase.from("productos").select("id, amazon_sku, sku");
  const porSku = new Map<string, string>();
  for (const p of productos ?? []) {
    if (p.amazon_sku) porSku.set(p.amazon_sku.trim().toLowerCase(), p.id);
    porSku.set(p.sku.trim().toLowerCase(), p.id);
  }
  const { pedidos, errores } = parseAmazonReport(texto, porSku);
  if (!pedidos.length) return { error: `No se encontraron pedidos válidos. ${errores.slice(0, 3).join(" ")}` };
  const { data: existentes } = await supabase.from("pedidos").select("ref_externa").eq("canal", "amazon").in("ref_externa", pedidos.map((p) => p.ref_externa));
  const ya = new Set((existentes ?? []).map((e) => e.ref_externa));
  let nuevos = 0;
  for (const p of pedidos) {
    if (ya.has(p.ref_externa)) continue;
    const { data, error } = await supabase.from("pedidos").insert({ canal: "amazon", ref_externa: p.ref_externa, fecha: p.fecha, cliente_nombre: p.cliente ?? null, descuento: p.descuento, envio_cobrado: p.envio }).select("id").single();
    if (error) { errores.push(`${p.ref_externa}: ${error.message}`); continue; }
    await supabase.from("pedido_lineas").insert(p.lineas.map((l) => ({ ...l, pedido_id: data.id })));
    nuevos++;
  }
  await supabase.from("sync_log").insert({ fuente: "amazon_csv", resultado: `${nuevos} nuevos, ${pedidos.length - nuevos} ya existían`, detalle: { errores } });
  revalidar();
  return { ok: `Importados ${nuevos} pedidos nuevos (${pedidos.length - nuevos} ya existían).${errores.length ? ` Avisos: ${errores.slice(0, 5).join(" · ")}` : ""}` };
}
