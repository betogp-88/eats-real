import { PageHeader, Card } from "@/components/ui";
import { ImportForm } from "./form";

export default function ImportarPage() {
  return (
    <>
      <PageHeader title="Importar pedidos de Amazon" subtitle="Sube el reporte de pedidos de Seller Central" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Archivo"><ImportForm /></Card>
        <Card title="Cómo obtener el reporte">
          <ol className="list-decimal pl-5 space-y-2 text-sm text-ink-soft">
            <li>En Seller Central ve a <strong>Reportes → Reportes de pedidos</strong> (Orders → Order Reports).</li>
            <li>Solicita el reporte <strong>“Todos los pedidos”</strong> (All Orders) para el rango de fechas que quieras.</li>
            <li>Descarga el archivo .txt (separado por tabulaciones) y súbelo aquí.</li>
            <li>El SKU de cada línea debe coincidir con el <strong>SKU en Amazon</strong> capturado en el catálogo.</li>
          </ol>
          <p className="text-sm text-ink-soft mt-4">Los pedidos que ya existan (mismo número de pedido de Amazon) se omiten, así que puedes subir el mismo reporte varias veces sin duplicar. Los pedidos entran como <em>pendientes</em> para que asignes el lote al despacharlos. Captura la comisión de Amazon en cada pedido o como gasto mensual en la categoría Comisiones.</p>
        </Card>
      </div>
    </>
  );
}
