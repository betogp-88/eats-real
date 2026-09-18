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
  shopify: "Shopify",
  amazon: "Amazon",
  directa: "Directa",
  consignacion: "Consignación",
};

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
