import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function money(n: number | string | null | undefined, decimals = 2) {
  const v = Number(n ?? 0);
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function num(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("es-MX");
}

export function fecha(d: string | null | undefined) {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export function mesActual() {
  return new Date().toISOString().slice(0, 7);
}

export const CANALES: Record<string, string> = {
  directa: "Venta directa",
  punto_venta: "Punto de venta",
  shopify: "Shopify",
  amazon: "Amazon",
  consignacion: "Consignación (anterior)",
};

export const MODALIDADES: Record<string, string> = {
  consignacion: "Consignación",
  directa: "Venta directa",
};

export function diasTexto(d: number | null | undefined) {
  if (d == null) return "Sin compras";
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

/** Semáforo de seguimiento por días sin comprar. */
export function semaforo(dias: number | null | undefined): { color: "green" | "orange" | "red" | "gray"; label: string } {
  if (dias == null) return { color: "gray", label: "Nuevo" };
  if (dias <= 45) return { color: "green", label: "Activo" };
  if (dias <= 90) return { color: "orange", label: "En riesgo" };
  return { color: "red", label: "Inactivo" };
}

export function pct(part: number, total: number) {
  return total > 0 ? `${((part / total) * 100).toFixed(0)}%` : "—";
}

export const ESTADOS_PEDIDO: Record<string, string> = {
  pendiente: "Pendiente",
  despachado: "Despachado",
  cancelado: "Cancelado",
};

export const ESTADOS_LOTE: Record<string, string> = {
  borrador: "Borrador",
  recibido: "Recibido",
  cerrado: "Cerrado",
};

export const CATEGORIAS_GASTO = ["Renta", "Nómina", "Software", "Envíos", "Comisiones", "Contabilidad", "Otros"];
export const CANALES_MARKETING = ["Meta", "Google", "TikTok", "Influencers", "Otro"];
export const CONCEPTOS_LOTE = ["Maquila", "Materia prima", "Empaque", "Etiquetas", "Flete", "Otros"];

export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
