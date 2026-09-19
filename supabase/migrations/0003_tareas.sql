-- Tareas y pendientes entre socios.
-- Ejecutar COMPLETO en el SQL Editor de Supabase después de 0002.

-- ---------------------------------------------------------------
-- Perfiles: copia ligera de auth.users para poder listar y asignar
-- ---------------------------------------------------------------
create table if not exists perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nombre     text,
  creado_en  timestamptz not null default now()
);

create or replace function sincronizar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists auth_usuario_creado on auth.users;
create trigger auth_usuario_creado after insert or update of email on auth.users
  for each row execute function sincronizar_perfil();

-- Usuarios que ya existían
insert into perfiles (id, email, nombre)
  select id, email, coalesce(raw_user_meta_data->>'nombre', raw_user_meta_data->>'name', split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Tareas
-- ---------------------------------------------------------------
create table if not exists tareas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descripcion    text,
  creado_por     uuid not null references perfiles(id),
  asignado_a     uuid references perfiles(id),
  prioridad      text not null default 'media' check (prioridad in ('baja','media','alta')),
  estado         text not null default 'pendiente' check (estado in ('pendiente','hecha')),
  fecha_limite   date,
  completada_en  timestamptz,
  creado_en      timestamptz not null default now()
);
create index if not exists tareas_asignado_idx on tareas (asignado_a, estado);
create index if not exists tareas_creador_idx on tareas (creado_por, estado);

-- ---------------------------------------------------------------
-- Seguridad y permisos
-- ---------------------------------------------------------------
alter table perfiles enable row level security;
alter table tareas enable row level security;
drop policy if exists "autenticados_leen" on perfiles;
drop policy if exists "propio_perfil" on perfiles;
drop policy if exists "autenticados_todo" on tareas;
create policy "autenticados_leen" on perfiles for select to authenticated using (true);
create policy "propio_perfil" on perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "autenticados_todo" on tareas for all to authenticated using (true) with check (true);
grant select, update on perfiles to authenticated;
grant select, insert, update, delete on tareas to authenticated;
