// Lee y normaliza las variables de Supabase.
// Acepta la URL con o sin "/rest/v1/" al final (Supabase la muestra así en Data API).
export function supabaseEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  return { url, key };
}
