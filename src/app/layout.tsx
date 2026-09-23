import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { empresa, estiloMarca } from "@/lib/empresa";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${empresa.nombre} Admin`,
  description: `Administración de producción, inventario, ventas y resultados de ${empresa.nombre}`,
  icons: empresa.logo ? { icon: empresa.logo } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${outfit.variable} h-full antialiased`} style={estiloMarca}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
