import { PageHeader, Card, Field } from "@/components/ui";
import { ActionForm } from "@/components/ui/client";
import { importarPuntosVenta } from "../actions";

export default function ImportarPuntosVentaPage() {
  return (
    <>
      <PageHeader title="Importar puntos de venta" subtitle="Sube un CSV con las tiendas; las rutas que no existan se crean" back={{ href: "/puntos-venta", label: "Puntos de venta" }} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Archivo">
          <ActionForm action={importarPuntosVenta} submit="Importar" pendingLabel="Importando…">
            <Field label="CSV" hint="Desde Excel: Guardar como → CSV UTF-8"><input name="archivo" type="file" accept=".csv,.txt,.tsv" required /></Field>
          </ActionForm>
        </Card>
        <Card title="Formato">
          <p className="text-sm text-ink-soft mb-2">Primera fila con estos encabezados (el orden no importa; solo <strong>nombre</strong> es obligatorio):</p>
          <code className="block text-xs bg-muted rounded-lg p-3 mb-3">nombre, ruta, modalidad, contacto, telefono, email, direccion, orden, notas</code>
          <ul className="text-sm text-ink-soft space-y-1 list-disc pl-5">
            <li><strong>modalidad</strong>: <code>consignacion</code> o <code>directa</code>. Si va vacío, consignación.</li>
            <li><strong>ruta</strong>: nombre de la ruta (Zona Norte). Se crea si no existe; luego le pones día y frecuencia en Rutas.</li>
            <li><strong>orden</strong>: posición dentro de la ruta (1, 2, 3…).</li>
            <li>Las tiendas que ya existan con el mismo nombre se omiten, así que puedes subir el archivo varias veces.</li>
          </ul>
          <p className="text-sm mt-3"><a href="/plantillas/puntos_venta.csv" download className="text-brand hover:underline">Descargar plantilla de ejemplo</a></p>
        </Card>
      </div>
    </>
  );
}
