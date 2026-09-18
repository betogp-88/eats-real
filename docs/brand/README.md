# Marca Eats Real

Logo original: `Eat's Real` en blob verde oscuro. Fuente: archivo vectorial del cliente (`.ai` / `.pdf`).
Exportado aquí como `logo.svg`, `logo-512.png` y `logo-1024.png` (fondo transparente).

## Colores del logo (exactos, del vector)

| Nombre         | Hex       | Uso en el admin                              |
|----------------|-----------|----------------------------------------------|
| Verde oscuro   | `#0E4138` | Color primario: sidebar, encabezados, botones principales |
| Verde claro    | `#74AB9A` | Secundario: acentos, estados positivos, hover |
| Crema del logo | `#F2F2F3` | Texto sobre verde oscuro                     |

## Colores del sitio web (muestreados de capturas)

| Nombre            | Hex       | Uso en el admin                       |
|-------------------|-----------|---------------------------------------|
| Naranja CTA       | `#FE8237` | Acción destacada, alertas de atención |
| Naranja suave     | `#FFC09F` | Estado deshabilitado del naranja      |
| Crema de fondo    | `#FFF8ED` | Fondo general de la app               |
| Gris tarjeta      | `#F2F2F2` | Fondo de tarjetas y tablas            |
| Negro             | `#111111` | Texto principal                       |

## Colores por sabor (etiquetas de producto, opcional para el catálogo)

| Sabor   | Hex       |
|---------|-----------|
| Fresa   | `#D54863` |
| Manzana | `#D75857` |
| Mango   | `#F5A623` |
| Plátano | `#E8C21A` |
| Piña    | `#82C2BF` (menta) / `#E8C21A` (amarillo) |

## Tipografía

El sitio usa una sans geométrica redondeada (parece **Outfit**). Para el admin: Outfit desde Google Fonts para títulos y UI, con fallback a `system-ui`.

## Tokens propuestos (Tailwind)

```js
colors: {
  brand: {
    DEFAULT: '#0E4138',   // verde oscuro
    light:   '#74AB9A',   // verde claro
    accent:  '#FE8237',   // naranja
    cream:   '#FFF8ED',   // fondo
    ink:     '#111111',   // texto
  },
}
```
