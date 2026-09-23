-- Varias empresas en un mismo proyecto de Supabase.
-- Membresías: qué usuario puede ver qué empresa. Eats Real vive en el esquema public
-- y las demás empresas en su propio esquema (ver supabase/empresas/plantilla_empresa.sql).
-- Ejecutar COMPLETO después de 0003.

create table if not exists public.membresias (
  user_id   uuid not null references public.perfiles(id) on delete cascade,
  empresa   text not null,          -- 'eats_real', 'maix', ...
  creado_en timestamptz not null default now(),
  primary key (user_id, empresa)
);

-- ¿El usuario actual es miembro de la empresa?
create or replace function public.es_miembro(p_empresa text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membresias m where m.user_id = auth.uid() and m.empresa = p_empresa);
$$;
revoke execute on function public.es_miembro(text) from public, anon;
grant execute on function public.es_miembro(text) to authenticated;

alter table public.membresias enable row level security;
drop policy if exists "ver_mis_membresias" on public.membresias;
create policy "ver_mis_membresias" on public.membresias for select to authenticated using (user_id = auth.uid());
grant select on public.membresias to authenticated;

-- Todos los usuarios que ya existen son de Eats Real
insert into public.membresias (user_id, empresa) select id, 'eats_real' from public.perfiles on conflict do nothing;

-- Las tablas de Eats Real (esquema public) pasan a exigir membresía
do $$
declare t text;
begin
  for t in select unnest(array['productos','maquiladores','ubicaciones','lotes','lote_costos','movimientos_inv',
                               'pedidos','pedido_lineas','despachos','gastos_marketing','gastos','sync_log',
                               'clientes','puntos_venta','tareas']) loop
    execute format('drop policy if exists "autenticados_todo" on public.%I', t);
    execute format('drop policy if exists "miembros_todo" on public.%I', t);
    execute format('create policy "miembros_todo" on public.%I for all to authenticated using (public.es_miembro(''eats_real'')) with check (public.es_miembro(''eats_real''))', t);
  end loop;
end $$;
