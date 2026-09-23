# Varias empresas en el mismo proyecto de Supabase

El código es uno solo. Cada empresa tiene su **esquema** de Postgres con las mismas tablas, su propio proyecto de **Vercel** apuntando a este mismo repo, y sus variables de entorno (nombre, logo, colores, esquema). Los usuarios (Authentication) se comparten; la tabla `public.membresias` dice quién puede entrar a qué empresa.

## Dar de alta una empresa nueva (ejemplo: Maix)

### 1. Base de datos (una vez)
1. Asegúrate de que `0001` a `0004` ya estén aplicadas (y `0006` después del esquema nuevo).
2. Genera el SQL de la empresa: toma `plantilla_empresa.sql`, reemplaza `__SCHEMA__` por el slug (minúsculas, sin espacios, p. ej. `maix`). Para Maix ya está generado en `supabase/migrations/0005_maix.sql`.
3. Ejecuta ese archivo COMPLETO en el SQL Editor.
4. En Supabase: **Settings → Data API → Exposed schemas**, agrega el esquema (`maix`) y guarda.

### 2. Usuarios
1. **Authentication → Users**: crea los usuarios de la empresa nueva (o reutiliza los existentes si una misma persona está en ambas).
2. Dales acceso en el SQL Editor:
   ```sql
   insert into public.membresias (user_id, empresa)
   select id, 'maix' from public.perfiles where email in ('socio1@maix.mx', 'socio2@maix.mx');
   ```
   Un usuario sin membresía ve una pantalla de "Sin acceso" y no puede leer nada de esa empresa.

### 3. Vercel
1. **Add New Project**, importa el mismo repo `eats-real`. Ponle de nombre `maix` (la URL será `maix-xxxx.vercel.app`).
2. Variables de entorno (tipo Config):
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: las mismas del proyecto.
   - `NEXT_PUBLIC_EMPRESA=maix`
   - `NEXT_PUBLIC_MARCA_NOMBRE=Maix`
   - `NEXT_PUBLIC_MARCA_LOGO=/logos/maix.png` (ya está en `public/logos/`), o `none` para iniciales.
   - Colores (ver `docs/brand/maix/README.md`): `NEXT_PUBLIC_COLOR_PRIMARIO=#1a1a1a`, `NEXT_PUBLIC_COLOR_SECUNDARIO=#b89b5e`, `NEXT_PUBLIC_COLOR_ACENTO=#d9a521`, `NEXT_PUBLIC_COLOR_ACENTO_SUAVE=#f1e2b3`, `NEXT_PUBLIC_COLOR_FONDO=#f7f5f0`.
3. Deploy. Para despliegues automáticos, crea un Deploy Hook en este proyecto de Vercel y agrégalo como secreto de GitHub con otro nombre, o simplemente haz Redeploy cuando haya cambios.

## Cambios de esquema en el futuro
Cuando una migración nueva cambie tablas, hay que aplicarla en `public` (Eats Real) **y** en cada esquema de empresa. La plantilla es la referencia de cómo debe quedar cada esquema.
