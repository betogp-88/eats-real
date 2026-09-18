"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button, Field, Alert } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Correo">
        <input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Contraseña">
        <input name="password" type="password" required autoComplete="current-password" />
      </Field>
      {state?.error && <Alert>{state.error}</Alert>}
      <Button type="submit" className="w-full justify-center" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
