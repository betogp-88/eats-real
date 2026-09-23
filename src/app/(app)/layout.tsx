import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Logo } from "@/components/logo";
import { empresa } from "@/lib/empresa";
import { logout } from "@/app/(auth)/login/actions";
import { sesion, RUTAS_ROL_RUTAS } from "@/lib/sesion";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, rol } = await sesion();

  if (!rol) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-card border border-line shadow-sm p-8 text-center space-y-4">
          <Logo size={72} className="mx-auto" />
          <h1 className="text-xl font-bold text-brand">Sin acceso a {empresa.nombre}</h1>
          <p className="text-sm text-ink-soft">Tu usuario <strong>{user?.email}</strong> existe, pero no tiene acceso a esta empresa. Pide a un administrador que te agregue en Usuarios.</p>
          <form action={logout}><button className="text-sm text-brand hover:underline">Cerrar sesión</button></form>
        </div>
      </main>
    );
  }

  if (rol === "rutas") {
    const path = (await headers()).get("x-ruta-actual") ?? "";
    if (path && !RUTAS_ROL_RUTAS.some((p) => path.startsWith(p))) redirect("/rutas");
  }

  return (
    <Shell email={user?.email} rol={rol} nombre={empresa.nombre} logo={<Logo size={44} className="bg-white/10 p-0.5 shrink-0" />}>
      {children}
    </Shell>
  );
}
