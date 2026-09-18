"use client";

import { useActionState } from "react";
import { Button, Field, Alert } from "@/components/ui";
import { importarAmazon } from "../actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importarAmazon, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Reporte (.txt o .csv)"><input name="archivo" type="file" accept=".txt,.csv,.tsv" required /></Field>
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert kind="ok">{state.ok}</Alert>}
      <Button type="submit" disabled={pending}>{pending ? "Importando…" : "Importar"}</Button>
    </form>
  );
}
