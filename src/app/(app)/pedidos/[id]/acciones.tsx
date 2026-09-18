"use client";

import { useActionState } from "react";
import { Button, Alert } from "@/components/ui";
import { cancelarPedido, eliminarPedido } from "../actions";

export function BotonCancelar({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelarPedido.bind(null, id), undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("¿Cancelar este pedido? Si ya fue despachado, el inventario regresa al almacén.")) e.preventDefault(); }}>
      <Button type="submit" variant="danger" disabled={pending}>Cancelar pedido</Button>
      {state?.error && <Alert>{state.error}</Alert>}
    </form>
  );
}

export function BotonEliminar({ id }: { id: string }) {
  const [state, action, pending] = useActionState(eliminarPedido.bind(null, id), undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("¿Eliminar este pedido pendiente?")) e.preventDefault(); }}>
      <Button type="submit" variant="ghost" disabled={pending}>Eliminar</Button>
      {state?.error && <Alert>{state.error}</Alert>}
    </form>
  );
}
