"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("invalid login credentials")) return { error: "Correo o contraseña incorrectos." };
    if (m.includes("email not confirmed")) return { error: "El usuario no está confirmado. En Supabase → Authentication → Users confírmalo o créalo con «Auto confirm user»." };
    return { error: `No se pudo iniciar sesión: ${error.message}` };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
