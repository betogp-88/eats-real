# Eats Real Admin

Administrador interno de Eats Real: producción por lotes, inventario, ventas por canal, despacho con costo por lote, marketing, gastos y estado de resultados.

Diseño completo en [`docs/DISENO.md`](docs/DISENO.md). Identidad visual en [`docs/brand/`](docs/brand/README.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel.

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en orden `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, `supabase/migrations/0002_clientes_puntos_venta.sql` y `supabase/migrations/0003_tareas.sql`.
3. En **Authentication → Users**, crea los usuarios de los socios (correo y contraseña). No hay registro público.
4. En **Settings → API** copia la URL del proyecto y la clave `anon`.

### 2. App

```bash
cp .env.example .env.local   # pon la URL y la clave anon
npm install
npm run dev                  # http://localhost:3000
```

### 3. Vercel

Importa el repo en Vercel y define las mismas dos variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) como tipo **Config**.

Para que cada push despliegue solo aunque el commit no sea de un miembro del equipo de Vercel: crea un **Deploy Hook** en Vercel (Settings → Git → Deploy Hooks) y guárdalo en GitHub como secreto `VERCEL_DEPLOY_HOOK` (Settings → Secrets and variables → Actions). El workflow `.github/workflows/deploy.yml` lo llama en cada push.

## Flujo de uso

1. **Producción**: registra cada lote con sus costos y márcalo como recibido en almacén. Eso da entrada al inventario y fija el costo por bolsa.
2. **Pedidos**: captura ventas directas (el cliente se busca por nombre o celular y se crea si no existe), ventas a puntos de venta, o importa el reporte de Amazon. «Guardar y despachar» descuenta inventario del lote más próximo a caducar.
3. **Clientes**: lista ordenada por días sin comprar, con enlace a WhatsApp para dar seguimiento.
4. **Puntos de venta**: tiendas a consignación o venta directa; inventario que tienen, frecuencia de pedido y contacto.
5. **Gastos y marketing**: captura mensual que alimenta el estado de resultados.
6. **Resultados**: estado de resultados mensual y margen por producto y canal.
7. **Tareas**: pendientes personales o asignados a otro socio, con prioridad y fecha límite.

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
Deploy inicial
