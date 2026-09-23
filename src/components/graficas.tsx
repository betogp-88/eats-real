import { money } from "@/lib/utils";

/**
 * Barras mensuales de un año contra una meta lineal (línea punteada).
 * Una sola serie: color de marca; la meta en gris neutro. Tooltip nativo por barra.
 */
export function BarrasVsMeta({ valores, meta, etiquetas, resaltar }: { valores: number[]; meta?: number; etiquetas: string[]; resaltar?: number }) {
  const W = 720, H = 220, padL = 8, padR = 8, padT = 16, padB = 28;
  const n = valores.length;
  const metaMes = meta ? meta / n : 0;
  const max = Math.max(...valores, metaMes, 1) * 1.15;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const bw = innerW / n;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const acumulado = valores.reduce<number[]>((acc, v, i) => [...acc, (acc[i - 1] ?? 0) + v], []);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Ventas por mes contra la meta">
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={padL} x2={W - padR} y1={y(max * f / 1.15)} y2={y(max * f / 1.15)} stroke="var(--line)" strokeWidth={1} />)}
      {metaMes > 0 && <line x1={padL} x2={W - padR} y1={y(metaMes)} y2={y(metaMes)} stroke="var(--ink-soft)" strokeWidth={2} strokeDasharray="6 4" />}
      {metaMes > 0 && <text x={W - padR} y={y(metaMes) - 5} textAnchor="end" fontSize={11} fill="var(--ink-soft)">meta mensual {money(metaMes, 0)}</text>}
      {valores.map((v, i) => {
        const x = padL + i * bw + bw * 0.18, w = bw * 0.64, top = y(v), h = padT + innerH - top;
        const activo = i === resaltar;
        return (
          <g key={i}>
            <rect x={x} y={v > 0 ? top : padT + innerH} width={w} height={v > 0 ? h : 0} rx={4} fill={activo ? "var(--brand-accent)" : "var(--brand)"} opacity={v > 0 ? 1 : 0}>
              <title>{`${etiquetas[i]}: ${money(v, 0)} · acumulado ${money(acumulado[i], 0)}`}</title>
            </rect>
            {v > 0 && v >= max * 0.08 && <text x={x + w / 2} y={top - 4} textAnchor="middle" fontSize={10} fill="var(--ink)">{money(v, 0)}</text>}
            <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--ink-soft)">{etiquetas[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Barra de progreso con esperado a la fecha. */
export function Progreso({ pct, ritmo, esperadoPct }: { pct: number; ritmo: number; esperadoPct: number }) {
  const color = ritmo >= 0.95 ? "var(--brand)" : ritmo >= 0.75 ? "var(--brand-accent)" : "#dc2626";
  return (
    <div className="relative h-3 rounded-full bg-muted overflow-visible">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
      {esperadoPct > 0 && esperadoPct < 1 && <div className="absolute top-[-3px] h-[18px] w-0.5 bg-ink-soft" style={{ left: `${esperadoPct * 100}%` }} title="Esperado a la fecha" />}
    </div>
  );
}
