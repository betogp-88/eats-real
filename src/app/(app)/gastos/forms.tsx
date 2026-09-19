"use client";

import { ActionForm } from "@/components/ui/client";
import { Field, MoneyInput } from "@/components/ui";
import { crearGasto, crearGastoMarketing } from "./actions";
import { hoy, CATEGORIAS_GASTO, CANALES_MARKETING } from "@/lib/utils";

export function GastoForm() {
  return (
    <ActionForm action={crearGasto} submit="Registrar gasto">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Field label="Fecha"><input name="fecha" type="date" required defaultValue={hoy()} /></Field>
        <Field label="Categoría"><select name="categoria" required>{CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Proveedor"><input name="proveedor" /></Field>
        <Field label="Monto"><MoneyInput name="monto" required placeholder="0.00" /></Field>
        <Field label="Nota"><input name="nota" /></Field>
      </div>
    </ActionForm>
  );
}

export function MarketingForm() {
  return (
    <ActionForm action={crearGastoMarketing} submit="Registrar inversión">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Field label="Canal"><select name="canal" required>{CANALES_MARKETING.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Campaña"><input name="campana" placeholder="Opcional" /></Field>
        <Field label="Desde"><input name="fecha_inicio" type="date" required defaultValue={hoy().slice(0, 8) + "01"} /></Field>
        <Field label="Hasta"><input name="fecha_fin" type="date" required defaultValue={hoy()} /></Field>
        <Field label="Monto"><MoneyInput name="monto" required placeholder="0.00" /></Field>
      </div>
    </ActionForm>
  );
}
