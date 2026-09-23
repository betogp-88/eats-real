import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Empty, Tabs, Panel, Stat } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/client";
import { fecha } from "@/lib/utils";
import { empresa } from "@/lib/empresa";
import { DocumentoForm, DatosEmpresaForm, CuentaForm, CATEGORIAS } from "./forms";
import { eliminarDocumento, eliminarCuenta } from "./actions";

export default async function LegalPage({ searchParams }: PageProps<"/legal">) {
  const sp = await searchParams;
  const cat = typeof sp.cat === "string" ? sp.cat : "todos";
  const supabase = await createClient();
  let q = supabase.from("documentos_legales").select("*, puntos_venta(nombre)").order("fecha_documento", { ascending: false, nullsFirst: false }).order("creado_en", { ascending: false }).limit(500);
  if (cat !== "todos" && cat !== "empresa") q = q.eq("categoria", cat);
  const [{ data: docs }, { data: datos }, { data: cuentas }, { data: puntosVenta }, { data: todos }] = await Promise.all([
    q,
    supabase.from("datos_empresa").select("clave, valor"),
    supabase.from("cuentas_bancarias").select("*").eq("activo", true).order("banco"),
    supabase.from("puntos_venta").select("id, nombre").eq("activo", true).order("nombre").limit(1000),
    supabase.from("documentos_legales").select("categoria, vigencia_hasta"),
  ]);
  const valores = Object.fromEntries((datos ?? []).map((d) => [d.clave, d.valor]));
  const hoy = new Date(); const en60 = new Date(hoy.getTime() + 60 * 86400000).toISOString().slice(0, 10); const hoyStr = hoy.toISOString().slice(0, 10);
  const porVencer = (todos ?? []).filter((d) => d.vigencia_hasta && d.vigencia_hasta >= hoyStr && d.vigencia_hasta <= en60).length;
  const vencidos = (todos ?? []).filter((d) => d.vigencia_hasta && d.vigencia_hasta < hoyStr).length;
  const conteo = new Map<string, number>(); for (const d of todos ?? []) conteo.set(d.categoria, (conteo.get(d.categoria) ?? 0) + 1);
  const firmados = docs?.length ? (await supabase.storage.from("legal").createSignedUrls(docs.filter((d) => d.archivo).map((d) => d.archivo as string), 3600)).data ?? [] : [];
  const urlDe = new Map(firmados.map((f) => [f.path, f.signedUrl]));
  const tabs = [{ key: "todos", href: "/legal", label: `Todos (${todos?.length ?? 0})` }, ...CATEGORIAS.map((c) => ({ key: c.key, href: `/legal?cat=${c.key}`, label: `${c.label}${conteo.get(c.key) ? ` (${conteo.get(c.key)})` : ""}` })), { key: "empresa", href: "/legal?cat=empresa", label: "Datos y cuentas" }];

  return (
    <>
      <PageHeader title="Legal" subtitle={`Documentos, datos fiscales y cuentas de ${empresa.nombre}. Solo administradores.`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Documentos" value={String(todos?.length ?? 0)} />
        <Stat label="Contratos" value={String(conteo.get("contrato") ?? 0)} color="ink" />
        <Stat label="Por vencer (60 días)" value={String(porVencer)} color={porVencer ? "red" : "brand"} />
        <Stat label="Vencidos" value={String(vencidos)} color={vencidos ? "red" : "brand"} />
      </div>
      <Tabs items={tabs} current={cat} />

      {cat === "empresa" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Datos de la empresa"><DatosEmpresaForm valores={valores} /></Card>
          <div className="space-y-4">
            <Card title="Cuentas bancarias" padded={false}>
              {!cuentas?.length ? <Empty>Sin cuentas registradas.</Empty> : (
                <table>
                  <thead><tr><th>Banco</th><th>Titular</th><th>CLABE</th><th>Cuenta</th><th>Uso</th><th></th></tr></thead>
                  <tbody>{cuentas.map((c) => <tr key={c.id}><td className="font-medium">{c.banco}</td><td>{c.titular}</td><td className="font-mono text-xs">{c.clabe}</td><td className="font-mono text-xs">{c.cuenta}</td><td className="text-ink-soft">{c.uso}</td><td className="text-right"><ConfirmButton action={async () => { "use server"; return eliminarCuenta(c.id); }} confirmText="¿Eliminar esta cuenta?" variant="ghost">Eliminar</ConfirmButton></td></tr>)}</tbody>
                </table>
              )}
            </Card>
            <Panel title="Agregar cuenta"><CuentaForm /></Panel>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" padded={false} title={cat === "todos" ? "Todos los documentos" : CATEGORIAS.find((c) => c.key === cat)?.label}>
            {!docs?.length ? <Empty>Sin documentos en esta categoría.</Empty> : (
              <table>
                <thead><tr><th>Documento</th><th>Categoría</th><th>Fecha</th><th>Vigencia</th><th></th></tr></thead>
                <tbody>{docs.map((d) => {
                  const url = d.archivo ? urlDe.get(d.archivo) : null;
                  const venc = d.vigencia_hasta ? (d.vigencia_hasta < hoyStr ? "red" : d.vigencia_hasta <= en60 ? "orange" : "gray") : null;
                  return (
                    <tr key={d.id}>
                      <td><p className="font-medium">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{d.titulo}</a> : d.titulo}</p><p className="text-xs text-ink-soft">{[d.contraparte, (d.puntos_venta as unknown as { nombre: string } | null)?.nombre, d.descripcion].filter(Boolean).join(" · ")}{!d.archivo && " · sin archivo"}</p></td>
                      <td><Badge>{CATEGORIAS.find((c) => c.key === d.categoria)?.label}</Badge></td>
                      <td>{fecha(d.fecha_documento) || "—"}</td>
                      <td>{d.vigencia_hasta ? <Badge color={venc as "red" | "orange" | "gray"}>{fecha(d.vigencia_hasta)}</Badge> : "—"}</td>
                      <td className="text-right"><ConfirmButton action={async () => { "use server"; return eliminarDocumento(d.id); }} confirmText="¿Eliminar el documento y su archivo?" variant="ghost">Eliminar</ConfirmButton></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
          </Card>
          <Card title="Subir documento"><DocumentoForm categoriaInicial={cat} puntosVenta={puntosVenta ?? []} /></Card>
        </div>
      )}
    </>
  );
}
