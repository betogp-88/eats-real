import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";
import { Logo } from "@/components/logo";
import { empresa } from "@/lib/empresa";
import { logout } from "@/app/(auth)/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membresia } = await supabase.schema("public").from("membresias").select("empresa").eq("empresa", empresa.slug).maybeSingle();

  if (!membresia) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-card border border-line shadow-sm p-8 text-center space-y-4">
          <Logo size={72} className="mx-auto" />
          <h1 className="text-xl font-bold text-brand">Sin acceso a {empresa.nombre}</h1>
          <p className="text-sm text-ink-soft">Tu usuario <strong>{user?.email}</strong> existe, pero no tiene acceso a esta empresa. Pide a un socio que te agregue en la tabla de membresías.</p>
          <form action={logout}><button className="text-sm text-brand hover:underline">Cerrar sesión</button></form>
        </div>
      </main>
    );
  }

  return (
    <Shell email={user?.email} nombre={empresa.nombre} logo={<Logo size={44} className="bg-white/10 p-0.5 shrink-0" />}>
      {children}
    </Shell>
  );
}
