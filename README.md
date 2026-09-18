# Eats Real Admin

Administrador interno de Eats Real: producción por lotes, inventario, ventas por canal, despacho con costo por lote, marketing, gastos y estado de resultados.

Diseño completo en [`docs/DISENO.md`](docs/DISENO.md). Identidad visual en [`docs/brand/`](docs/brand/README.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel.

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta `supabase/migrations/0001_init.sql` y después `supabase/seed.sql`.
3. En **Authentication → Users**, crea los usuarios de los socios (correo y contraseña). No hay registro público.
4. En **Settings → API** copia la URL del proyecto y la clave `anon`.

### 2. App

```bash
cp .env.example .env.local   # pon la URL y la clave anon
npm install
npm run dev                  # http://localhost:3000
```

### 3. Vercel

Importa el repo en Vercel y define las mismas dos variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Flujo de uso

1. **Catálogo**: revisa los productos y captura los SKU de Shopify y Amazon. Agrega maquiladores y puntos de consignación.
2. **Producción**: crea un lote por producto, captura sus costos (maquila, empaque, flete…) y, cuando llegue, márcalo como **recibido**. Eso da entrada al inventario y fija el costo por bolsa.
3. **Ventas**: captura pedidos directos o de consignación, o importa el reporte de Amazon. (Shopify por API viene en fase 2.)
4. **Despacho**: en cada pedido pendiente confirma qué lote sale. Se sugiere el más próximo a caducar. Ahí nace el costo de venta.
5. **Marketing y gastos**: captura la inversión en ads y los gastos operativos del mes.
6. **Resultados**: estado de resultados mensual y margen por producto y canal.

## Estructura

```
supabase/migrations/   esquema SQL (tablas, vistas, funciones de negocio, RLS)
supabase/seed.sql      ubicaciones y productos iniciales
src/app/(auth)/login   inicio de sesión
src/app/(app)/         módulos: productos, lotes, inventario, pedidos, marketing, gastos, resultados
src/lib/supabase/      clientes de Supabase (server y browser)
src/lib/amazon.ts      parser del reporte de pedidos de Amazon
src/proxy.ts           protección de rutas (redirige a /login sin sesión)
```

## Comandos

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run lint    # eslint
```
