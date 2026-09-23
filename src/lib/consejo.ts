import type { SupabaseClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, string, string, any, any>;

export const AREAS: { key: string; label: string; guia: string }[] = [
  { key: "ventas", label: "Ventas", guia: "Cómo cerró el mes contra el anterior y contra la meta. Qué jaló y qué no." },
  { key: "canales", label: "Canales de venta", guia: "Directo, puntos de venta, Shopify, Amazon: qué canal creció, cuál se cayó y por qué." },
  { key: "gastos", label: "Gastos", guia: "Gastos del mes, desviaciones, qué se puede recortar o qué inversión viene." },
  { key: "marketing", label: "Marketing", guia: "Campañas activas, inversión, resultados, qué se prueba el mes que entra." },
  { key: "operaciones", label: "Operaciones", guia: "Producción, inventario, caducidades, rutas y logística. Cuellos de botella." },
  { key: "rh", label: "Recursos humanos", guia: "Equipo, contrataciones, vacantes, temas de personal." },
  { key: "otros", label: "Otros temas", guia: "Lo que no cabe arriba: alianzas, riesgos, oportunidades." },
];

export type Kpis = {
  ventas_netas: number; costo_venta: number; utilidad_bruta: number; comisiones: number; costo_envio: number; marketing: number; gastos: number; utilidad_operativa: number;
  pedidos: number; bolsas: number; clientes_nuevos: number; tiendas_activas: number; visitas: number; saldo_por_cobrar: number;
  por_canal: Record<string, number>;
};

export function mesInicio(mes: string) { return `${mes.slice(0, 7)}-01`; }
export function mesFin(mes: string) { const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0); return d.toISOString().slice(0, 10); }
export function mesAnterior(mes: string) { const y = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7)); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; }
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const nombreMes = (mes: string, corto = false) => `${corto ? MESES[Number(mes.slice(5, 7)) - 1].slice(0, 3) : MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
export const MESES_NOMBRES = MESES;

/** Indicadores automáticos del sistema para un mes (YYYY-MM). */
export async function kpisDelMes(supabase: SB, mes: string): Promise<Kpis> {
  const ini = mesInicio(mes), fin = mesFin(mes);
  const [{ data: r }, { data: ventas }, { data: pedidos }, { data: clientes }, { data: tiendas }, { count: visitas }, { data: saldo }] = await Promise.all([
    supabase.from("resultados_mensuales").select("*").eq("mes", ini).maybeSingle(),
    supabase.from("ventas_detalle").select("canal, cantidad, venta").gte("fecha", ini).lte("fecha", fin),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).gte("fecha", ini).lte("fecha", fin).neq("estado", "cancelado"),
    supabase.from("clientes").select("id", { count: "exact", head: true }).gte("creado_en", ini).lte("creado_en", fin + "T23:59:59"),
    supabase.from("puntos_venta").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("visitas").select("id", { count: "exact", head: true }).gte("fecha", ini).lte("fecha", fin + "T23:59:59"),
    supabase.from("puntos_venta_resumen").select("saldo_pendiente"),
  ]);
  const vn = Number(r?.ventas_netas ?? 0), cv = Number(r?.costo_venta ?? 0), com = Number(r?.comisiones ?? 0), env = Number(r?.costo_envio ?? 0), mk = Number(r?.marketing ?? 0), g = Number(r?.gastos ?? 0);
  const por_canal: Record<string, number> = {};
  let bolsas = 0;
  for (const v of ventas ?? []) { por_canal[v.canal] = (por_canal[v.canal] ?? 0) + Number(v.venta); bolsas += v.cantidad; }
  return {
    ventas_netas: vn, costo_venta: cv, utilidad_bruta: vn - cv, comisiones: com, costo_envio: env, marketing: mk, gastos: g,
    utilidad_operativa: vn - cv - com - env - mk - g,
    pedidos: (pedidos as unknown as { count?: number } | null)?.count ?? 0,
    bolsas, clientes_nuevos: (clientes as unknown as { count?: number } | null)?.count ?? 0,
    tiendas_activas: (tiendas as unknown as { count?: number } | null)?.count ?? 0,
    visitas: visitas ?? 0,
    saldo_por_cobrar: (saldo ?? []).reduce((s, x) => s + Number(x.saldo_pendiente), 0),
    por_canal,
  };
}

/** Ventas netas por mes de un año (12 posiciones, 0 donde no hay). */
export async function ventasPorMes(supabase: SB, anio: number): Promise<number[]> {
  const { data } = await supabase.from("resultados_mensuales").select("mes, ventas_netas").gte("mes", `${anio}-01-01`).lte("mes", `${anio}-12-31`);
  const out = Array(12).fill(0);
  for (const r of data ?? []) out[Number(String(r.mes).slice(5, 7)) - 1] = Number(r.ventas_netas);
  return out;
}

export type Meta = { id: string; anio: number; tipo: string; nombre: string; descripcion: string | null; valor_meta: number; unidad: string; responsable_id: string | null; orden: number };
export type Avance = { meta_id: string; mes: string; valor: number; nota: string | null };

/** Progreso de una meta: valor actual, esperado a la fecha y porcentaje. */
export function progresoMeta(meta: Meta, avances: Avance[], ventasMes: number[], hoy = new Date()) {
  const esAnioActual = hoy.getFullYear() === meta.anio;
  const mesesTranscurridos = esAnioActual ? hoy.getMonth() + 1 : hoy.getFullYear() > meta.anio ? 12 : 0;
  let actual = 0; let ultimoMes: string | null = null;
  if (meta.tipo === "ventas") {
    actual = ventasMes.reduce((s, v) => s + v, 0);
  } else {
    const propios = avances.filter((a) => a.meta_id === meta.id).sort((a, b) => a.mes.localeCompare(b.mes));
    const ult = propios[propios.length - 1];
    actual = ult ? Number(ult.valor) : 0; ultimoMes = ult?.mes ?? null;
  }
  const meta_v = Number(meta.valor_meta);
  const esperado = meta_v * (mesesTranscurridos / 12);
  const pct = meta_v > 0 ? actual / meta_v : 0;
  const ritmo = esperado > 0 ? actual / esperado : 0;
  return { actual, esperado, pct, ritmo, mesesTranscurridos, ultimoMes };
}

export function formatoUnidad(v: number, unidad: string) {
  if (unidad === "MXN") return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  if (unidad === "%") return `${v.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`;
  return `${v.toLocaleString("es-MX", { maximumFractionDigits: 0 })} ${unidad}`;
}
