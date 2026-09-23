@AGENTS.md

# Eats Real Admin

Admin interno (Next.js App Router + Supabase) para una marca de snacks. Ver `docs/DISENO.md` para el modelo y `README.md` para instalación.

## Convenciones
- Idioma de UI, comentarios, commits y docs: español.
- Columna vertebral del negocio: Lote → Inventario (movimientos) → Pedido → Despacho → Costo de venta. No capturar inventario directo; siempre movimientos.
- Lógica transaccional vive en funciones SQL (`recibir_lote`, `trasladar_inventario`, `despachar_pedido`, `cancelar_pedido`) llamadas vía `supabase.rpc`. Cambios de esquema van en un nuevo archivo `supabase/migrations/000N_*.sql`.
- Páginas son Server Components que consultan Supabase; mutaciones son Server Actions en `actions.ts` de cada módulo; formularios interactivos son Client Components pequeños (`form.tsx`, `acciones.tsx`).
- Componentes base en `src/components/ui/index.tsx`; colores de marca como tokens en `globals.css` (`brand`, `brand-light`, `accent`, `cream`).
- Multiempresa: la app lee la empresa de `src/lib/empresa.ts` (env). Tablas de negocio van al esquema de la empresa (cliente por default); `perfiles` y `membresias` siempre con `supabase.schema("public")`. Toda migración nueva se aplica en `public` y se refleja en `supabase/empresas/plantilla_empresa.sql`.
- Montos en MXN. Usar `money()`, `num()`, `fecha()` de `src/lib/utils.ts`.

## Verificación
`npm run lint && npx tsc --noEmit && npm run build`. Para validar SQL sin Supabase: aplicar la migración en un Postgres local con roles `authenticated` y `anon` creados.
