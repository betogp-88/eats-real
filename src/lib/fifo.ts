import type { SupabaseClient } from "@supabase/supabase-js";

export type LoteDisponible = { id: string; codigo: string; fecha_caducidad: string | null; costo_unitario: number; disponible: number };
export type LineaDespacho = { id: string; producto: string; cantidad: number; lotes: LoteDisponible[]; sugerido: Record<string, number> };
export type Asignacion = { linea_id: string; lote_id: string; cantidad: number };

type Linea = { id: string; producto_id: string; cantidad: number; productos?: { nombre: string } | null };

/** Ubicación de la que sale el inventario para un pedido (almacén por defecto). */
export async function ubicacionDePedido(supabase: SupabaseClient, ubicacionId: string | null) {
  if (ubicacionId) return ubicacionId;
  const { data } = await supabase.from("ubicaciones").select("id").eq("tipo", "almacen").eq("activo", true).order("nombre").limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Lotes disponibles por línea, ordenados FIFO (caducidad más próxima, luego producción más antigua), con sugerencia. */
export async function sugerirDespacho(supabase: SupabaseClient, lineas: Linea[], ubicacionId: string | null): Promise<LineaDespacho[]> {
  const ubic = await ubicacionDePedido(supabase, ubicacionId);
  const { data: ex } = await supabase
    .from("existencias")
    .select("lote_id, producto_id, cantidad, lotes(codigo, fecha_caducidad, fecha_produccion, costo_unitario)")
    .eq("ubicacion_id", ubic ?? "00000000-0000-0000-0000-000000000000")
    .gt("cantidad", 0);
  type Ex = { lote_id: string; producto_id: string; cantidad: number; lotes: { codigo: string; fecha_caducidad: string | null; fecha_produccion: string; costo_unitario: number } | null };
  const existencias = (ex ?? []) as unknown as Ex[];
  return lineas.map((l) => {
    const lotes = existencias
      .filter((e) => e.producto_id === l.producto_id && e.lotes)
      .sort((a, b) => (a.lotes!.fecha_caducidad ?? "9999").localeCompare(b.lotes!.fecha_caducidad ?? "9999") || a.lotes!.fecha_produccion.localeCompare(b.lotes!.fecha_produccion))
      .map((e) => ({ id: e.lote_id, codigo: e.lotes!.codigo, fecha_caducidad: e.lotes!.fecha_caducidad, costo_unitario: Number(e.lotes!.costo_unitario), disponible: e.cantidad }));
    const sugerido: Record<string, number> = {};
    let falta = l.cantidad;
    for (const lo of lotes) { if (falta <= 0) break; const q = Math.min(falta, lo.disponible); sugerido[lo.id] = q; falta -= q; }
    return { id: l.id, producto: l.productos?.nombre ?? "", cantidad: l.cantidad, lotes, sugerido };
  });
}

/** Convierte la sugerencia en asignaciones; regresa null si alguna línea no se cubre. */
export function asignacionesDe(lineas: LineaDespacho[]): Asignacion[] | null {
  const out: Asignacion[] = [];
  for (const l of lineas) {
    const total = Object.values(l.sugerido).reduce((s, v) => s + v, 0);
    if (total < l.cantidad) return null;
    for (const [lote_id, cantidad] of Object.entries(l.sugerido)) if (cantidad > 0) out.push({ linea_id: l.id, lote_id, cantidad });
  }
  return out;
}
