# Eats Real Admin — Diseño del sistema

Administrador interno para Eats Real (snacks saludables). Objetivo: saber cuánto cuesta cada bolsa, cuánto inventario hay y dónde, qué se vendió por canal, y cuánto se ganó. Base sencilla que crece por fases.

## Contexto del negocio

- 8 SKUs. Un lote de producción es de un solo producto.
- Producción por maquilador. El maquilador entrega un costo completo; ademas se agregan costos propios (empaque, etiquetas, flete, etc.).
- ~50 pedidos al mes. Envío directo desde almacén propio (no FBA).
- Canales: Shopify (principal), Amazon (envío propio), ventas directas. Consignación: ~4 puntos, poco frecuente, pero debe quedar soportada.
- Stack: Next.js en Vercel, Supabase (Postgres + Auth), GitHub. Mismo patrón que la app de Un Dígito Más.

## Principio rector

Una sola columna vertebral: **Lote → Inventario → Venta → Despacho → Costo de venta**.
Marketing y gastos son satélites que alimentan el estado de resultados.

Reglas de diseño:

1. **El inventario se deriva, no se captura.** Existe un libro de movimientos; las existencias son la suma por producto, lote y ubicación.
2. **Cada unidad vendida queda amarrada a un lote** y hereda su costo unitario real.
3. **Un solo modelo de pedido** para todos los canales, con campo `canal`.
4. **Consignación es una ubicación**, no un módulo aparte.

## Módulos

### 1. Catálogo
Productos (SKU interno, nombre, presentación, precio lista, mapeo a SKU de Shopify y ASIN/SKU de Amazon, activo).

### 2. Producción (lotes)
Un lote = un producto, una fecha, un maquilador, N bolsas finales, y una lista de partidas de costo (maquila, empaque, etiquetas, flete, otros).
Costo unitario = suma de costos / bolsas finales. Se recalcula al editar.
Estados: `borrador` → `recibido` (genera entrada de inventario) → `cerrado` (costos finales, ya no se edita).

### 3. Inventario
Ubicaciones: `almacen`, una por punto de consignación, `merma`.
Movimientos: `entrada_lote`, `salida_venta`, `traslado`, `ajuste`, `merma`.
Vistas: existencias por producto, por lote (con fecha y caducidad si aplica), por ubicación.

### 4. Ventas
Pedido: canal, referencia externa (id de Shopify / Amazon), fecha, cliente, líneas (producto, cantidad, precio unitario, descuento), envío cobrado, comisión de plataforma, estado.
Fuentes:
- Shopify: sincronización por API (fase 1).
- Amazon: importación de reporte CSV (fase 1); API SP después.
- Directa / consignación: formulario manual.

### 5. Despacho
Al marcar un pedido como despachado, cada línea se asigna a uno o más lotes.
Por defecto FIFO (lote más antiguo con existencias en `almacen`); el usuario puede cambiar el lote antes de confirmar.
Genera movimientos `salida_venta` y guarda el costo unitario del lote en la línea. Ese es el costo de venta.

### 6. Marketing
Registro de gasto por canal (Meta, Google, TikTok, influencers, otro), periodo, monto, notas. Captura manual o CSV en fase 1. Integración con APIs de Ads en fase 2.

### 7. Gastos
Libro de gastos: fecha, categoría (renta, nómina, software, envíos, comisiones, otros), monto, proveedor, nota.

### 8. Estado de resultados
Por mes (o rango de fechas), con filtros por canal y producto:

```
Ventas netas (precio − descuentos)
− Costo de venta (desde despacho)
= Utilidad bruta
− Comisiones y envíos de plataforma
− Marketing
− Gastos operativos
= Utilidad operativa
```

Más: margen bruto por producto, por canal y por lote.

## Modelo de datos (Postgres / Supabase)

```
productos          id, sku, nombre, presentacion, precio_lista, shopify_sku, amazon_sku, activo
maquiladores       id, nombre, contacto
lotes              id, producto_id, maquilador_id, codigo, fecha_produccion, fecha_caducidad,
                   bolsas_finales, estado, costo_unitario (calculado), notas
lote_costos        id, lote_id, concepto, monto
ubicaciones        id, nombre, tipo (almacen | consignacion | merma), activo
movimientos_inv    id, fecha, tipo, producto_id, lote_id, ubicacion_id, cantidad (+/−),
                   referencia_tipo, referencia_id, nota
pedidos            id, canal, ref_externa, fecha, cliente_nombre, cliente_email,
                   subtotal, descuento, envio_cobrado, comision_plataforma, total,
                   estado (pendiente | despachado | cancelado), ubicacion_id
pedido_lineas      id, pedido_id, producto_id, cantidad, precio_unitario, descuento
despachos          id, pedido_linea_id, lote_id, cantidad, costo_unitario
gastos_marketing   id, fecha_inicio, fecha_fin, canal, monto, campana, nota
gastos             id, fecha, categoria, monto, proveedor, nota
sync_log           id, fuente, ejecutado_en, resultado, detalle
```

Existencias = `SUM(cantidad)` de `movimientos_inv` agrupado por producto, lote, ubicación (vista SQL).

## Flujos clave

**Recibir un lote:** crear lote en borrador → capturar bolsas y costos → marcar recibido → se crea `entrada_lote` en `almacen`.

**Vender por Shopify:** cron diario (o botón "sincronizar") trae pedidos nuevos → se crean `pedidos` en estado pendiente → el usuario despacha (FIFO sugerido) → se crean `despachos` y `salida_venta`.

**Consignación:** traslado `almacen` → `consignacion:tienda X`. Cuando la tienda reporta ventas, se captura un pedido con canal `consignacion` y ubicación de esa tienda; el despacho descuenta de ahí.

**Cierre de mes:** revisar pedidos pendientes, capturar marketing y gastos, ver estado de resultados.

## Plan por fases

**Fase 1 — Base (lo que construimos primero)**
1. Proyecto Next.js + Supabase + Auth (login para socios).
2. Catálogo de productos y maquiladores.
3. Lotes con costos y costo unitario.
4. Inventario por movimientos y vistas de existencias.
5. Pedidos manuales + importación CSV de Amazon.
6. Despacho con FIFO y asignación de lote.
7. Gastos y marketing manual.
8. Estado de resultados básico.

**Fase 2**
- Sincronización con Shopify por API.
- Dashboard de inicio (ventas del mes, margen, inventario bajo).
- Devoluciones y cancelaciones con reversión de inventario.

**Fase 3**
- Amazon SP-API.
- Meta / Google Ads API.
- Liquidación de consignación (cuentas por cobrar por tienda).
- Alertas de caducidad y de inventario mínimo.

## Fuera de alcance por ahora
Recetas o lista de materiales, contabilidad fiscal/CFDI, multi-empresa, roles granulares, app móvil.

## Stack técnico
- Next.js (App Router, TypeScript), Tailwind + shadcn/ui.
- Supabase: Postgres, Auth, Row Level Security básica.
- Vercel para hosting y cron jobs de sincronización.
- Moneda MXN, montos con IVA incluido salvo que se defina lo contrario.

## Identidad visual
Assets y paleta en `docs/brand/`. Primario verde oscuro `#0E4138`, secundario verde claro `#74AB9A`, acento naranja `#FE8237`, fondo crema `#FFF8ED`, tipografía Outfit.

## Fase 1.5 (implementada)
- **Clientes**: tabla `clientes` y `pedidos.cliente_id`. Búsqueda por nombre o celular al capturar pedidos directos; se crean al vuelo. Vista `clientes_resumen` (pedidos, total, última compra, días sin comprar) para la lista de seguimiento y enlace a WhatsApp.
- **Puntos de venta**: tabla `puntos_venta` con modalidad (`consignacion` | `directa`) y su ubicación de inventario cuando es a consignación. Canal de pedido `punto_venta`. Vista `puntos_venta_resumen` (frecuencia de pedido, inventario en tienda, total vendido).
- **Usabilidad**: formulario único de lote (costos en renglones, entrada a almacén opcional), formulario único de pedido con «Guardar y despachar» (FIFO automático), menú por grupos, maquiladores como pestaña de Producción, gastos y marketing en una pantalla, inventario con acciones desplegables, avisos y confirmaciones, inicio orientado a acción.
- **Tareas**: tabla `tareas` (creador, asignado, prioridad, fecha límite, estado) y `perfiles` sincronizada desde `auth.users` por trigger para poder asignar entre socios.
