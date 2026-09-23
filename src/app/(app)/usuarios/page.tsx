import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Field, Empty } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { empresa } from "@/lib/empresa";
import { agregarUsuario, cambiarRol, quitarUsuario } from "./actions";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: miembros } = await supabase.schema("public").from("membresias").select("user_id, rol, perfiles(email, nombre)").eq("empresa", empresa.slug);
  type M = { user_id: string; rol: string; perfiles: { email: string; nombre: string | null } | null };
  const lista = ((miembros ?? []) as unknown as M[]).sort((a, b) => (a.perfiles?.email ?? "").localeCompare(b.perfiles?.email ?? ""));

  return (
    <>
      <PageHeader title="Usuarios" subtitle={`Quién puede entrar a ${empresa.nombre} y con qué permisos`} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Con acceso" className="lg:col-span-2" padded={false}>
          {!lista.length ? <Empty>Nadie todavía.</Empty> : (
            <table>
              <thead><tr><th>Usuario</th><th>Rol</th><th></th></tr></thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.user_id}>
                    <td><span className="font-medium">{m.perfiles?.nombre ?? m.perfiles?.email?.split("@")[0]}</span><br /><span className="text-xs text-ink-soft">{m.perfiles?.email}</span>{m.user_id === user?.id && <Badge>Tú</Badge>}</td>
                    <td><Badge color={m.rol === "admin" ? "green" : "orange"}>{m.rol === "admin" ? "Administrador" : "Rutas"}</Badge></td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      {m.user_id !== user?.id && (
                        <>
                          <ConfirmButton action={async () => { "use server"; return cambiarRol(m.user_id, m.rol === "admin" ? "rutas" : "admin"); }} confirmText={`¿Cambiar a ${m.rol === "admin" ? "Rutas" : "Administrador"}?`} variant="secondary">{m.rol === "admin" ? "Hacer de rutas" : "Hacer administrador"}</ConfirmButton>
                          <ConfirmButton action={async () => { "use server"; return quitarUsuario(m.user_id); }} confirmText="¿Quitar el acceso a esta empresa?">Quitar</ConfirmButton>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Dar acceso">
          <p className="text-sm text-ink-soft mb-3">El usuario debe existir primero en Supabase (Authentication → Users). Aquí solo le das acceso a esta empresa.</p>
          <ActionForm action={agregarUsuario} submit="Agregar">
            <div className="space-y-3">
              <Field label="Correo"><input name="email" type="email" required /></Field>
              <Field label="Rol" hint="Rutas: solo ve rutas, visitas, puntos de venta y tareas. Administrador: todo.">
                <select name="rol" defaultValue="rutas"><option value="rutas">Rutas</option><option value="admin">Administrador</option></select>
              </Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
