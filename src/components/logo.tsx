import Image from "next/image";
import { empresa } from "@/lib/empresa";

/** Logo de la empresa; si no hay imagen, muestra las iniciales. */
export function Logo({ size = 44, className = "" }: { size?: number; className?: string }) {
  if (empresa.logo) {
    return <Image src={empresa.logo} alt={empresa.nombre} width={size} height={size} className={`rounded-full ${className}`} priority />;
  }
  const iniciales = empresa.nombre.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-brand-light text-white font-bold ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {iniciales}
    </span>
  );
}
