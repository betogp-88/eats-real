// Parser del reporte de pedidos de Amazon Seller Central
// (Reportes → Pedidos → "Todos los pedidos", archivo .txt separado por tabulaciones, o CSV).

export type PedidoImportado = {
  ref_externa: string;
  fecha: string;
  cliente?: string;
  descuento: number;
  envio: number;
  lineas: { producto_id: string; cantidad: number; precio_unitario: number }[];
};

function splitLine(line: string, sep: string): string[] {
  if (sep === "\t") return line.split("\t");
  const out: string[] = []; let cur = ""; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseAmazonReport(texto: string, porSku: Map<string, string>) {
  const lines = texto.split(/\r?\n/).filter((l) => l.trim());
  const errores: string[] = [];
  if (lines.length < 2) return { pedidos: [], errores: ["Archivo vacío."] };
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], sep).map((h) => h.trim().toLowerCase().replace(/[\s_]+/g, "-"));
  const col = (...names: string[]) => { for (const n of names) { const i = headers.indexOf(n); if (i >= 0) return i; } return -1; };
  const iOrder = col("amazon-order-id", "order-id");
  const iDate = col("purchase-date", "payments-date", "order-date");
  const iSku = col("sku", "seller-sku");
  const iQty = col("quantity", "quantity-purchased", "quantity-shipped");
  const iPrice = col("item-price", "price");
  const iPromo = col("item-promotion-discount", "promotion-discount");
  const iShip = col("shipping-price");
  const iStatus = col("order-status");
  const iName = col("buyer-name", "recipient-name");
  if (iOrder < 0 || iSku < 0 || iQty < 0) {
    return { pedidos: [], errores: ["El archivo no tiene las columnas amazon-order-id, sku y quantity."] };
  }

  const mapa = new Map<string, PedidoImportado>();
  for (const line of lines.slice(1)) {
    const c = splitLine(line, sep);
    const ref = c[iOrder]?.trim();
    if (!ref) continue;
    const status = iStatus >= 0 ? c[iStatus]?.trim().toLowerCase() : "";
    if (status === "cancelled" || status === "canceled") continue;
    const skuRaw = c[iSku]?.trim().toLowerCase();
    const producto_id = porSku.get(skuRaw);
    if (!producto_id) { errores.push(`SKU "${c[iSku]}" no está en el catálogo (pedido ${ref}).`); continue; }
    const cantidad = Number(c[iQty]) || 0;
    if (cantidad <= 0) continue;
    const total = Number(c[iPrice]) || 0;          // item-price es el total de la línea
    const precio_unitario = Math.round((total / cantidad) * 100) / 100;
    const fecha = (iDate >= 0 ? c[iDate] : "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    const p = mapa.get(ref) ?? { ref_externa: ref, fecha, cliente: iName >= 0 ? c[iName]?.trim() : undefined, descuento: 0, envio: 0, lineas: [] };
    p.lineas.push({ producto_id, cantidad, precio_unitario });
    p.descuento += Math.abs(Number(iPromo >= 0 ? c[iPromo] : 0) || 0);
    p.envio += Number(iShip >= 0 ? c[iShip] : 0) || 0;
    mapa.set(ref, p);
  }
  return { pedidos: [...mapa.values()].filter((p) => p.lineas.length), errores };
}
