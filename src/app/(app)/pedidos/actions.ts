"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAmazonReport } from "@/lib/amazon";

type Result = { error?: string; ok?: string } | undefined;

function revalidarTodo(id?: string) {
  revalidatePath("/pedidos");
  revalidatePath("/inventario");
  revalidatePath("/resultados");
  revalidatePath("/");
  if (id) revalidatePath(`/pedidos/${id}`);
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
  const pedido = {
    canal,
    ref_externa: String(fd.get("ref_externa") ?? "").trim() || null,
    fecha: String(fd.get("fecha")),
    cliente_nombre: String(fd.get("cliente_nombre") ?? "").trim() || null,
    cliente_email: String(fd.get("cliente_email") ?? "").trim() || null,
    ubicacion_id: canal === "consignacion" ? String(fd.get("ubicacion_id") ?? "") || null : null,
    descuento: Number(fd.get("descuento") ?? 0),
    envio_cobrado: Number(fd.get("envio_cobrado") ?? 0),
    comision_plataforma: Number(fd.get("comision_plataforma") ?? 0),
    costo_envio: Number(fd.get("costo_envio") ?? 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
  };
  if (canal === "consignacion" && !pedido.ubicacion_id) return { error: "Selecciona el punto de consignación." };

  const { data, error } = await supabase.from("pedidos").insert(pedido).select("id").single();
  if (error) return { error: error.message };
  const { error: e2 } = await supabase.from("pedido_lineas").insert(lineas.map((l) => ({ ...l, pedido_id: data.id })));
  if (e2) {
    await supabase.from("pedidos").delete().eq("id", data.id);
    return { error: e2.message };
  }
  revalidarTodo();
  redirect(`/pedidos/${data.id}`);
}

export async function actualizarCargos(id: string, fd: FormData) {
  const supabase = await createClient();
  await supabase.from("pedidos").update({
    descuento: Number(fd.get("descuento") ?? 0),
    envio_cobrado: Number(fd.get("envio_cobrado") ?? 0),
    comision_plataforma: Number(fd.get("comision_plataforma") ?? 0),
    costo_envio: Number(fd.get("costo_envio") ?? 0),
    notas: String(fd.get("notas") ?? "").trim() || null,
  }).eq("id", id);
  revalidarTodo(id);
}

export async function despachar(id: string, _p: Result, fd: FormData): Promise<Result> {
  const supabase = await createClient();
  const asignaciones: { linea_id: string; lote_id: string; cantidad: number }[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^asig\[(.+)\]\[(.+)\]$/.exec(k);
    if (m && Number(v) > 0) asignaciones.push({ linea_id: m[1], lote_id: m[2], cantidad: Number(v) });
  }
  if (!asignaciones.length) return { error: "Asigna al menos un lote." };
  const { error } = await supabase.rpc("despachar_pedido", { p_pedido: id, p_asignaciones: asignaciones });
  if (error) return { error: error.message };
  revalidarTodo(id);
  return { ok: "Pedido despachado." };
}

export async function cancelarPedido(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_pedido", { p_pedido: id });
  if (error) return { error: error.message };
  revalidarTodo(id);
  return {};
}

export async function eliminarPedido(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").delete().eq("id", id).eq("estado", "pendiente");
  if (error) return { error: error.message };
  revalidarTodo();
  redirect("/pedidos");
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
    const { data, error } = await supabase.from("pedidos").insert({
      canal: "amazon", ref_externa: p.ref_externa, fecha: p.fecha, cliente_nombre: p.cliente ?? null,
      descuento: p.descuento, envio_cobrado: p.envio,
    }).select("id").single();
    if (error) { errores.push(`${p.ref_externa}: ${error.message}`); continue; }
    await supabase.from("pedido_lineas").insert(p.lineas.map((l) => ({ ...l, pedido_id: data.id })));
    nuevos++;
  }
  await supabase.from("sync_log").insert({ fuente: "amazon_csv", resultado: `${nuevos} nuevos, ${pedidos.length - nuevos} ya existían`, detalle: { errores } });
  revalidarTodo();
  return { ok: `Importados ${nuevos} pedidos nuevos (${pedidos.length - nuevos} ya existían).${errores.length ? ` Avisos: ${errores.slice(0, 5).join(" · ")}` : ""}` };
}
