"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, Button } from "./index";
import { cn } from "@/lib/utils";

export type Result = { error?: string; ok?: string } | undefined;

/** Formulario con estado: muestra error u ok que regrese la acción. */
export function ActionForm({ action, children, submit = "Guardar", variant = "primary", className, extra, pendingLabel = "Guardando…", confirmText }: {
  action: (prev: Result, fd: FormData) => Promise<Result>;
  children: ReactNode; submit?: ReactNode; variant?: "primary" | "secondary" | "accent" | "danger"; className?: string; extra?: ReactNode; pendingLabel?: string; confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} onSubmit={(e) => { if (confirmText && !confirm(confirmText)) e.preventDefault(); }}>
      {children}
      {state?.error && <div className="mt-3"><Alert>{state.error}</Alert></div>}
      {state?.ok && <div className="mt-3"><Alert kind="ok">{state.ok}</Alert></div>}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <Button type="submit" variant={variant} disabled={pending}>{pending ? pendingLabel : submit}</Button>
        {extra}
      </div>
    </form>
  );
}

/** Botón que ejecuta una acción con confirmación (para borrar, cancelar, etc.). */
export function ConfirmButton({ action, confirmText, children, variant = "danger", className }: {
  action: (prev: Result, fd: FormData) => Promise<Result>; confirmText: string; children: ReactNode; variant?: "primary" | "secondary" | "accent" | "danger" | "ghost"; className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} onSubmit={(e) => { if (!confirm(confirmText)) e.preventDefault(); }} className="inline">
      <Button type="submit" variant={variant} disabled={pending} className={cn("text-xs px-2.5 py-1.5", className)}>{children}</Button>
      {state?.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

/** Aviso flotante que lee ?ok= o ?error= de la URL, lo muestra unos segundos y limpia la URL. */
export function Toast() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const ok = sp.get("ok");
  const error = sp.get("error");
  const texto = ok ?? error;
  const [oculto, setOculto] = useState<string | null>(null);

  useEffect(() => {
    if (!texto) return;
    const t = setTimeout(() => {
      setOculto(texto);
      const params = new URLSearchParams(sp.toString());
      params.delete("ok"); params.delete("error");
      router.replace(params.size ? `${path}?${params}` : path, { scroll: false });
    }, ok ? 3500 : 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  if (!texto || oculto === texto) return null;
  return (
    <div className={cn("fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2.5 text-sm shadow-lg max-w-[90vw]", ok ? "bg-brand text-white" : "bg-red-600 text-white")} role="status">
      {texto}
    </div>
  );
}
