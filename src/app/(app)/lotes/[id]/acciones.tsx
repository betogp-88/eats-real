"use client";

import { useActionState } from "react";
import { Button, Alert } from "@/components/ui";
import { recibirLote, eliminarLote } from "../actions";

export function BotonRecibir({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(recibirLote.bind(null, id), undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <Button type="submit" variant="accent" disabled={disabled || pending}>{pending ? "Recibiendo…" : "Marcar recibido y dar entrada a inventario"}</Button>
      {state?.error && <Alert>{state.error}</Alert>}
    </form>
  );
}

export function BotonEliminar({ id }: { id: string }) {
  const [state, action, pending] = useActionState(eliminarLote.bind(null, id), undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("¿Eliminar este lote en borrador?")) e.preventDefault(); }}>
      <Button type="submit" variant="danger" disabled={pending}>Eliminar borrador</Button>
      {state?.error && <Alert>{state.error}</Alert>}
    </form>
  );
}
