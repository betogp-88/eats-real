import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Empty, Badge, Chip, Panel } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { fecha, hoy } from "@/lib/utils";
import { NuevaTareaForm, EditarTarea, MiNombreForm, nombreDe, type Perfil } from "./forms";
import { marcarTarea, eliminarTarea } from "./actions";

const prioridadColor = { alta: "red", media: "orange", baja: "gray" } as const;
const prioridadLabel = { alta: "Alta", media: "Media", baja: "Baja" } as const;

export default async function TareasPage({ searchParams }: PageProps<"/tareas">) {
  const sp = await searchParams;
  const filtro = typeof sp.f === "string" ? sp.f : "mias";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const yo = user!.id;
  const [{ data: perfiles }, { data: tareas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, email").order("nombre"),
    supabase.from("tareas").select("*, creador:perfiles!tareas_creado_por_fkey(id, nombre, email), asignado:perfiles!tareas_asignado_a_fkey(id, nombre, email)").order("estado").order("fecha_limite", { ascending: true, nullsFirst: false }).order("creado_en", { ascending: false }).limit(300),
  ]);
  type T = NonNullable<typeof tareas>[number] & { creador: Perfil | null; asignado: Perfil | null };
  let lista = (tareas ?? []) as unknown as T[];
  if (filtro === "mias") lista = lista.filter((t) => t.asignado_a === yo);
  if (filtro === "asigne") lista = lista.filter((t) => t.creado_por === yo && t.asignado_a !== yo);
  const pendientes = lista.filter((t) => t.estado === "pendiente");
  const hechas = lista.filter((t) => t.estado === "hecha").slice(0, 30);
  const miPerfil = (perfiles ?? []).find((p) => p.id === yo);
  const h = hoy();

  const Fila = ({ t }: { t: T }) => {
    const vencida = t.estado === "pendiente" && t.fecha_limite && t.fecha_limite < h;
    return (
      <li className="flex gap-3 px-4 py-3 border-b border-line/60 last:border-b-0">
        <ConfirmButton action={async () => { "use server"; return marcarTarea(t.id, t.estado !== "hecha"); }} confirmText={t.estado === "hecha" ? "¿Marcar como pendiente otra vez?" : "¿Marcar como hecha?"} variant="ghost" className={`!p-0 w-6 h-6 rounded-full border-2 shrink-0 mt-0.5 ${t.estado === "hecha" ? "bg-brand border-brand text-white" : "border-line hover:border-brand"}`}>{t.estado === "hecha" ? "✓" : ""}</ConfirmButton>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${t.estado === "hecha" ? "line-through text-ink-soft" : ""}`}>{t.titulo}</p>
          {t.descripcion && <p className="text-sm text-ink-soft whitespace-pre-line">{t.descripcion}</p>}
          <div className="flex flex-wrap gap-2 items-center mt-1 text-xs text-ink-soft">
            <Badge color={prioridadColor[t.prioridad as keyof typeof prioridadColor]}>{prioridadLabel[t.prioridad as keyof typeof prioridadLabel]}</Badge>
            {t.fecha_limite && <span className={vencida ? "text-red-600 font-medium" : ""}>{vencida ? "Venció " : "Para "}{fecha(t.fecha_limite)}</span>}
            <span>{t.asignado_a === yo ? "Para mí" : `Para ${nombreDe(t.asignado)}`}{t.creado_por !== yo && ` · de ${nombreDe(t.creador)}`}{t.creado_por === yo && t.asignado_a !== yo && " · la asigné yo"}</span>
            {t.estado === "hecha" && t.completada_en && <span>· hecha {fecha(t.completada_en)}</span>}
            {t.estado === "pendiente" && <EditarTarea tarea={t} perfiles={perfiles ?? []} yo={yo} />}
            <ConfirmButton action={async () => { "use server"; return eliminarTarea(t.id); }} confirmText="¿Eliminar esta tarea?" variant="ghost" className="!px-1 !py-0 text-xs">Eliminar</ConfirmButton>
          </div>
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Tareas" subtitle="Pendientes personales y entre socios" />
      <div className="flex flex-wrap gap-2 mb-4">
        <Chip href="/tareas?f=mias" active={filtro === "mias"}>Mis tareas</Chip>
        <Chip href="/tareas?f=asigne" active={filtro === "asigne"}>Las que asigné</Chip>
        <Chip href="/tareas?f=todas" active={filtro === "todas"}>Todas</Chip>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title={`Pendientes (${pendientes.length})`} padded={false}>
            {!pendientes.length ? <Empty>Nada pendiente por aquí.</Empty> : <ul>{pendientes.map((t) => <Fila key={t.id} t={t} />)}</ul>}
          </Card>
          {hechas.length > 0 && <Panel title={`Hechas recientemente (${hechas.length})`}><ul className="-mx-4 -my-4">{hechas.map((t) => <Fila key={t.id} t={t} />)}</ul></Panel>}
        </div>
        <div className="space-y-4">
          <Card title="Nueva tarea"><NuevaTareaForm perfiles={perfiles ?? []} yo={yo} /></Card>
          <Panel title="Mi nombre"><MiNombreForm nombre={miPerfil?.nombre ?? null} /></Panel>
        </div>
      </div>
    </>
  );
}
