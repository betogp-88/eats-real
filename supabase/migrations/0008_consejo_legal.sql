-- Consejo (metas, juntas, compromisos) y Legal (documentos). Ejecutar COMPLETO después de 0007.
-- Aplica a public (Eats Real) y a maix.

-- Bucket privado para documentos legales, carpeta por empresa
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('legal', 'legal', false) on conflict (id) do nothing;
    execute 'drop policy if exists "legal_admins_leen" on storage.objects';
    execute 'drop policy if exists "legal_admins_suben" on storage.objects';
    execute 'drop policy if exists "legal_admins_borran" on storage.objects';
    execute $p$create policy "legal_admins_leen" on storage.objects for select to authenticated
      using (bucket_id = 'legal' and public.es_admin((storage.foldername(name))[1]))$p$;
    execute $p$create policy "legal_admins_suben" on storage.objects for insert to authenticated
      with check (bucket_id = 'legal' and public.es_admin((storage.foldername(name))[1]))$p$;
    execute $p$create policy "legal_admins_borran" on storage.objects for delete to authenticated
      using (bucket_id = 'legal' and public.es_admin((storage.foldername(name))[1]))$p$;
  end if;
end $$;

-- ===== Consejo (metas, juntas, compromisos) y Legal (documentos) — bloque por esquema =====
set search_path to public, public;

-- Metas anuales. tipo 'ventas' se calcula del sistema (ventas netas acumuladas del año);
-- tipo 'manual' se actualiza en cada junta con un avance.
create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  anio integer not null,
  tipo text not null default 'manual' check (tipo in ('ventas','manual')),
  nombre text not null,
  descripcion text,
  valor_meta numeric(14,2) not null default 0,
  unidad text not null default 'MXN',          -- MXN, bolsas, tiendas, %, clientes, texto libre
  responsable_id uuid references public.perfiles(id),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);
create index if not exists metas_anio_idx on metas (anio, orden);

create table if not exists metas_avances (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references metas(id) on delete cascade,
  mes date not null,                            -- primer día del mes
  valor numeric(14,2) not null default 0,       -- valor acumulado al cierre del mes
  nota text,
  creado_en timestamptz not null default now(),
  unique (meta_id, mes)
);

-- Juntas mensuales de consejo
create table if not exists juntas (
  id uuid primary key default gen_random_uuid(),
  mes date not null unique,                     -- mes que se revisa (primer día)
  fecha timestamptz,                            -- cuándo se celebró
  asistentes text,
  minuta jsonb not null default '{}'::jsonb,    -- { ventas, canales, gastos, marketing, operaciones, rh, otros }
  acuerdos text,
  estado text not null default 'borrador' check (estado in ('borrador','cerrada')),
  creado_por uuid references public.perfiles(id),
  cerrada_en timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists compromisos (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid references juntas(id) on delete set null,
  descripcion text not null,
  area text,
  responsable_id uuid references public.perfiles(id),
  fecha_limite date,
  estado text not null default 'pendiente' check (estado in ('pendiente','hecho','cancelado')),
  completado_en timestamptz,
  nota_cierre text,
  creado_en timestamptz not null default now()
);
create index if not exists compromisos_estado_idx on compromisos (estado, fecha_limite);

-- Legal: documentos y datos fijos
create table if not exists documentos_legales (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('constitutivo','asamblea','fiscal','bancario','contrato','permiso','otro')),
  titulo text not null,
  descripcion text,
  archivo text,                                 -- ruta en Storage (bucket "legal")
  archivo_nombre text,
  contraparte text,                             -- con quién es el contrato (tienda, retailer, proveedor)
  punto_venta_id uuid references puntos_venta(id),
  fecha_documento date,
  vigencia_hasta date,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);
create index if not exists documentos_legales_cat_idx on documentos_legales (categoria, fecha_documento desc);

create table if not exists datos_empresa (
  clave text primary key,                       -- razon_social, rfc, domicilio_fiscal, regimen, representante, notario, ...
  valor text,
  actualizado_en timestamptz not null default now()
);

create table if not exists cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  titular text,
  clabe text,
  cuenta text,
  uso text,                                     -- operación, nómina, ahorro...
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Seguridad: consejo y legal solo para administradores
do $$
declare t text;
begin
  for t in select unnest(array['metas','metas_avances','juntas','compromisos','documentos_legales','datos_empresa','cuentas_bancarias']) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admins_todo" on public.%I', t);
    execute format('create policy "admins_todo" on public.%I for all to authenticated using (public.es_admin(''eats_real'')) with check (public.es_admin(''eats_real''))', t);
  end loop;
end $$;
grant select, insert, update, delete on metas, metas_avances, juntas, compromisos, documentos_legales, datos_empresa, cuentas_bancarias to authenticated;

reset search_path;

-- ===== Consejo (metas, juntas, compromisos) y Legal (documentos) — bloque por esquema =====
set search_path to maix, public;

-- Metas anuales. tipo 'ventas' se calcula del sistema (ventas netas acumuladas del año);
-- tipo 'manual' se actualiza en cada junta con un avance.
create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  anio integer not null,
  tipo text not null default 'manual' check (tipo in ('ventas','manual')),
  nombre text not null,
  descripcion text,
  valor_meta numeric(14,2) not null default 0,
  unidad text not null default 'MXN',          -- MXN, bolsas, tiendas, %, clientes, texto libre
  responsable_id uuid references public.perfiles(id),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);
create index if not exists metas_anio_idx on metas (anio, orden);

create table if not exists metas_avances (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references metas(id) on delete cascade,
  mes date not null,                            -- primer día del mes
  valor numeric(14,2) not null default 0,       -- valor acumulado al cierre del mes
  nota text,
  creado_en timestamptz not null default now(),
  unique (meta_id, mes)
);

-- Juntas mensuales de consejo
create table if not exists juntas (
  id uuid primary key default gen_random_uuid(),
  mes date not null unique,                     -- mes que se revisa (primer día)
  fecha timestamptz,                            -- cuándo se celebró
  asistentes text,
  minuta jsonb not null default '{}'::jsonb,    -- { ventas, canales, gastos, marketing, operaciones, rh, otros }
  acuerdos text,
  estado text not null default 'borrador' check (estado in ('borrador','cerrada')),
  creado_por uuid references public.perfiles(id),
  cerrada_en timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists compromisos (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid references juntas(id) on delete set null,
  descripcion text not null,
  area text,
  responsable_id uuid references public.perfiles(id),
  fecha_limite date,
  estado text not null default 'pendiente' check (estado in ('pendiente','hecho','cancelado')),
  completado_en timestamptz,
  nota_cierre text,
  creado_en timestamptz not null default now()
);
create index if not exists compromisos_estado_idx on compromisos (estado, fecha_limite);

-- Legal: documentos y datos fijos
create table if not exists documentos_legales (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('constitutivo','asamblea','fiscal','bancario','contrato','permiso','otro')),
  titulo text not null,
  descripcion text,
  archivo text,                                 -- ruta en Storage (bucket "legal")
  archivo_nombre text,
  contraparte text,                             -- con quién es el contrato (tienda, retailer, proveedor)
  punto_venta_id uuid references puntos_venta(id),
  fecha_documento date,
  vigencia_hasta date,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);
create index if not exists documentos_legales_cat_idx on documentos_legales (categoria, fecha_documento desc);

create table if not exists datos_empresa (
  clave text primary key,                       -- razon_social, rfc, domicilio_fiscal, regimen, representante, notario, ...
  valor text,
  actualizado_en timestamptz not null default now()
);

create table if not exists cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  titular text,
  clabe text,
  cuenta text,
  uso text,                                     -- operación, nómina, ahorro...
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Seguridad: consejo y legal solo para administradores
do $$
declare t text;
begin
  for t in select unnest(array['metas','metas_avances','juntas','compromisos','documentos_legales','datos_empresa','cuentas_bancarias']) loop
    execute format('alter table maix.%I enable row level security', t);
    execute format('drop policy if exists "admins_todo" on maix.%I', t);
    execute format('create policy "admins_todo" on maix.%I for all to authenticated using (public.es_admin(''maix'')) with check (public.es_admin(''maix''))', t);
  end loop;
end $$;
grant select, insert, update, delete on metas, metas_avances, juntas, compromisos, documentos_legales, datos_empresa, cuentas_bancarias to authenticated;

reset search_path;
