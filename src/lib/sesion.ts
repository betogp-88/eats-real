import { createClient } from "@/lib/supabase/server";
import { empresa } from "@/lib/empresa";

export type Rol = "admin" | "rutas";

/** Usuario actual y su rol en esta empresa (null si no es miembro). */
export async function sesion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, rol: null as Rol | null };
  const { data } = await supabase.schema("public").from("membresias").select("rol").eq("empresa", empresa.slug).eq("user_id", user.id).maybeSingle();
  return { supabase, user, rol: (data?.rol as Rol | undefined) ?? null };
}

/** Rutas permitidas para el rol "rutas" (prefijos). */
export const RUTAS_ROL_RUTAS = ["/rutas", "/visitas", "/puntos-venta", "/tareas"];
