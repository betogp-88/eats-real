export const CLAVES_EMPRESA = [
  ["razon_social", "Razón social"], ["rfc", "RFC"], ["regimen", "Régimen fiscal"], ["domicilio_fiscal", "Domicilio fiscal"],
  ["representante", "Representante legal"], ["fecha_constitucion", "Fecha de constitución"], ["notaria", "Notaría y número de escritura"],
  ["registro_publico", "Folio en Registro Público"], ["contador", "Contador (nombre y contacto)"], ["abogado", "Abogado (nombre y contacto)"],
] as const;

export const CATEGORIAS: { key: string; label: string; desc: string }[] = [
  { key: "constitutivo", label: "Acta constitutiva", desc: "Escritura, estatutos, poderes" },
  { key: "asamblea", label: "Actas de asamblea", desc: "Ordinarias y extraordinarias" },
  { key: "fiscal", label: "Fiscal", desc: "Constancia de situación fiscal, opinión de cumplimiento, e.firma" },
  { key: "bancario", label: "Bancario", desc: "Contratos de cuenta, estados, cartas" },
  { key: "contrato", label: "Contratos", desc: "Puntos de venta, retailers, proveedores, maquila" },
  { key: "permiso", label: "Permisos y registros", desc: "COFEPRIS, marca (IMPI), licencias" },
  { key: "otro", label: "Otros", desc: "Lo que no cabe arriba" },
];
