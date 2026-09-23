/**
 * Configuración de la empresa que sirve esta instancia de la app.
 * Todo viene de variables de entorno (una por proyecto de Vercel); sin ellas es Eats Real.
 */
export type Empresa = {
  slug: string;        // clave de membresía ('eats_real', 'maix')
  schema: string;      // esquema de Postgres ('public', 'maix')
  nombre: string;
  logo: string | null; // ruta en /public o URL
  colores: { brand: string; brandLight: string; accent: string; accentSoft: string; cream: string };
};

const defaults: Empresa = {
  slug: "eats_real",
  schema: "public",
  nombre: "Eats Real",
  logo: "/logos/eats-real.png",
  colores: { brand: "#0e4138", brandLight: "#74ab9a", accent: "#fe8237", accentSoft: "#ffc09f", cream: "#fff8ed" },
};

const env = (k: string) => (process.env[k] ?? "").trim();

export const empresa: Empresa = {
  slug: env("NEXT_PUBLIC_EMPRESA") || defaults.slug,
  schema: env("NEXT_PUBLIC_DB_SCHEMA") || (env("NEXT_PUBLIC_EMPRESA") && env("NEXT_PUBLIC_EMPRESA") !== "eats_real" ? env("NEXT_PUBLIC_EMPRESA") : defaults.schema),
  nombre: env("NEXT_PUBLIC_MARCA_NOMBRE") || (env("NEXT_PUBLIC_EMPRESA") && env("NEXT_PUBLIC_EMPRESA") !== "eats_real" ? env("NEXT_PUBLIC_EMPRESA") : defaults.nombre),
  logo: env("NEXT_PUBLIC_MARCA_LOGO") ? (env("NEXT_PUBLIC_MARCA_LOGO") === "none" ? null : env("NEXT_PUBLIC_MARCA_LOGO")) : (env("NEXT_PUBLIC_EMPRESA") && env("NEXT_PUBLIC_EMPRESA") !== "eats_real" ? null : defaults.logo),
  colores: {
    brand: env("NEXT_PUBLIC_COLOR_PRIMARIO") || defaults.colores.brand,
    brandLight: env("NEXT_PUBLIC_COLOR_SECUNDARIO") || defaults.colores.brandLight,
    accent: env("NEXT_PUBLIC_COLOR_ACENTO") || defaults.colores.accent,
    accentSoft: env("NEXT_PUBLIC_COLOR_ACENTO_SUAVE") || defaults.colores.accentSoft,
    cream: env("NEXT_PUBLIC_COLOR_FONDO") || defaults.colores.cream,
  },
};

/** Variables CSS para inyectar en <html style>. */
export const estiloMarca = {
  "--brand": empresa.colores.brand,
  "--brand-light": empresa.colores.brandLight,
  "--brand-accent": empresa.colores.accent,
  "--brand-accent-soft": empresa.colores.accentSoft,
  "--cream": empresa.colores.cream,
} as React.CSSProperties;
