import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { ProductoForm } from "../form";

export default async function ProductoPage({ params }: PageProps<"/productos/[id]">) {
  const { id } = await params;
  if (id === "nuevo") return (<><PageHeader title="Nuevo producto" back={{ href: "/productos", label: "Productos" }} /><Card><ProductoForm /></Card></>);
  const supabase = await createClient();
  const { data } = await supabase.from("productos").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (<><PageHeader title={data.nombre} subtitle={data.sku} back={{ href: "/productos", label: "Productos" }} /><Card><ProductoForm producto={data} /></Card></>);
}
