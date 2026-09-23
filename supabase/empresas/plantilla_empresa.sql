-- ============================================================================
-- PLANTILLA: esquema completo de una empresa nueva en el mismo proyecto.
-- Reemplaza __SCHEMA__ por el slug de la empresa (minúsculas, sin espacios),
-- ejecuta el resultado COMPLETO en el SQL Editor, y luego en
-- Settings → Data API → Exposed schemas agrega ese esquema.
-- Requiere que 0001–0004 ya estén aplicadas (perfiles y membresías en public).
-- ============================================================================

create schema if not exists __SCHEMA__;
set search_path to __SCHEMA__, public;

-- ---------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------
create table if not exists productos (
  id uuid primary key default gen_random_uuid(), sku text not null unique, nombre text not null, presentacion text,
  precio_lista numeric(12,2) not null default 0, shopify_sku text, amazon_sku text, color text,
  activo boolean not null default true, creado_en timestamptz not null default now()
);
create table if not exists maquiladores (id uuid primary key default gen_random_uuid(), nombre text not null, contacto text, activo boolean not null default true);
create table if not exists ubicaciones (
  id uuid primary key default gen_random_uuid(), nombre text not null unique,
  tipo text not null check (tipo in ('almacen','consignacion','merma')), activo boolean not null default true
);

-- ---------------------------------------------------------------
-- Producción
-- ---------------------------------------------------------------
create table if not exists lotes (
  id uuid primary key default gen_random_uuid(), codigo text not null unique, producto_id uuid not null references productos(id),
  maquilador_id uuid references maquiladores(id), fecha_produccion date not null default current_date, fecha_caducidad date,
  bolsas_finales integer not null default 0 check (bolsas_finales >= 0),
  estado text not null default 'borrador' check (estado in ('borrador','recibido','cerrado')),
  costo_total numeric(12,2) not null default 0, costo_unitario numeric(12,4) not null default 0, notas text,
  creado_en timestamptz not null default now()
);
create table if not exists lote_costos (id uuid primary key default gen_random_uuid(), lote_id uuid not null references lotes(id) on delete cascade, concepto text not null, monto numeric(12,2) not null default 0);

create or replace function recalcular_costo_lote(p_lote uuid) returns void language plpgsql set search_path = __SCHEMA__, public as $$
declare v_total numeric(12,2); v_bolsas integer;
begin
  select coalesce(sum(monto),0) into v_total from lote_costos where lote_id = p_lote;
  select bolsas_finales into v_bolsas from lotes where id = p_lote;
  update lotes set costo_total = v_total, costo_unitario = case when v_bolsas > 0 then round(v_total / v_bolsas, 4) else 0 end where id = p_lote;
end $$;
create or replace function trg_lote_costos() returns trigger language plpgsql set search_path = __SCHEMA__, public as $$
begin perform recalcular_costo_lote(coalesce(new.lote_id, old.lote_id)); return null; end $$;
drop trigger if exists lote_costos_recalc on lote_costos;
create trigger lote_costos_recalc after insert or update or delete on lote_costos for each row execute function trg_lote_costos();
create or replace function trg_lotes_bolsas() returns trigger language plpgsql set search_path = __SCHEMA__, public as $$
begin if new.bolsas_finales is distinct from old.bolsas_finales then perform recalcular_costo_lote(new.id); end if; return null; end $$;
drop trigger if exists lotes_recalc on lotes;
create trigger lotes_recalc after update on lotes for each row execute function trg_lotes_bolsas();

-- ---------------------------------------------------------------
-- Inventario
-- ---------------------------------------------------------------
create table if not exists movimientos_inv (
  id uuid primary key default gen_random_uuid(), fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('entrada_lote','salida_venta','traslado','ajuste','merma')),
  producto_id uuid not null references productos(id), lote_id uuid not null references lotes(id), ubicacion_id uuid not null references ubicaciones(id),
  cantidad integer not null, referencia_tipo text, referencia_id uuid, nota text
);
create index if not exists movimientos_inv_idx on movimientos_inv (producto_id, lote_id, ubicacion_id);
create or replace view existencias as
  select m.producto_id, m.lote_id, m.ubicacion_id, sum(m.cantidad)::integer as cantidad
  from movimientos_inv m group by m.producto_id, m.lote_id, m.ubicacion_id having sum(m.cantidad) <> 0;

create or replace function recibir_lote(p_lote uuid) returns void language plpgsql set search_path = __SCHEMA__, public as $$
declare v_lote lotes%rowtype; v_almacen uuid;
begin
  select * into v_lote from lotes where id = p_lote for update;
  if v_lote.estado <> 'borrador' then raise exception 'El lote ya fue recibido'; end if;
  if v_lote.bolsas_finales <= 0 then raise exception 'El lote no tiene bolsas finales'; end if;
  select id into v_almacen from ubicaciones where tipo = 'almacen' and activo order by nombre limit 1;
  if v_almacen is null then raise exception 'No existe una ubicación de tipo almacén'; end if;
  insert into movimientos_inv (tipo, producto_id, lote_id, ubicacion_id, cantidad, referencia_tipo, referencia_id, nota)
  values ('entrada_lote', v_lote.producto_id, p_lote, v_almacen, v_lote.bolsas_finales, 'lote', p_lote, 'Recepción de lote ' || v_lote.codigo);
  update lotes set estado = 'recibido' where id = p_lote;
end $$;

create or replace function trasladar_inventario(p_lote uuid, p_origen uuid, p_destino uuid, p_cantidad integer, p_nota text default null)
returns void language plpgsql set search_path = __SCHEMA__, public as $$
declare v_prod uuid; v_disp integer; v_ref uuid := gen_random_uuid();
begin
  if p_cantidad <= 0 then raise exception 'La cantidad debe ser positiva'; end if;
  select producto_id into v_prod from lotes where id = p_lote;
  select coalesce(sum(cantidad),0) into v_disp from movimientos_inv where lote_id = p_lote and ubicacion_id = p_origen;
  if v_disp < p_cantidad then raise exception 'Existencias insuficientes en origen (% disponibles)', v_disp; end if;
  insert into movimientos_inv (tipo, producto_id, lote_id, ubicacion_id, cantidad, referencia_tipo, referencia_id, nota)
  values ('traslado', v_prod, p_lote, p_origen, -p_cantidad, 'traslado', v_ref, p_nota), ('traslado', v_prod, p_lote, p_destino, p_cantidad, 'traslado', v_ref, p_nota);
end $$;

-- ---------------------------------------------------------------
-- Clientes, puntos de venta, ventas
-- ---------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(), nombre text not null, telefono text, email text, direccion text,
  canal_origen text, notas text, creado_en timestamptz not null default now()
);
create index if not exists clientes_nombre_idx on clientes (lower(nombre));
create index if not exists clientes_telefono_idx on clientes (telefono);

create table if not exists puntos_venta (
  id uuid primary key default gen_random_uuid(), nombre text not null unique, contacto text, telefono text, email text, direccion text,
  modalidad text not null default 'consignacion' check (modalidad in ('consignacion','directa')),
  ubicacion_id uuid references ubicaciones(id), zona text, notas text, activo boolean not null default true, creado_en timestamptz not null default now()
);
create index if not exists puntos_venta_zona_idx on puntos_venta (zona);
create or replace function crear_punto_venta(p_datos jsonb) returns uuid language plpgsql set search_path = __SCHEMA__, public as $$
declare v_ubic uuid; v_id uuid; v_nombre text := p_datos->>'nombre';
begin
  if coalesce(p_datos->>'modalidad','consignacion') = 'consignacion' then
    insert into ubicaciones (nombre, tipo) values (v_nombre, 'consignacion')
    on conflict (nombre) do update set activo = true, tipo = 'consignacion' returning id into v_ubic;
  end if;
  insert into puntos_venta (nombre, contacto, telefono, email, direccion, modalidad, ubicacion_id, zona, notas)
  values (v_nombre, p_datos->>'contacto', p_datos->>'telefono', p_datos->>'email', p_datos->>'direccion', coalesce(p_datos->>'modalidad','consignacion'), v_ubic, p_datos->>'zona', p_datos->>'notas')
  returning id into v_id;
  return v_id;
end $$;

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('shopify','amazon','directa','consignacion','punto_venta')),
  ref_externa text, fecha date not null default current_date, cliente_nombre text, cliente_email text,
  cliente_id uuid references clientes(id), punto_venta_id uuid references puntos_venta(id), ubicacion_id uuid references ubicaciones(id),
  descuento numeric(12,2) not null default 0, envio_cobrado numeric(12,2) not null default 0,
  comision_plataforma numeric(12,2) not null default 0, costo_envio numeric(12,2) not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','despachado','cancelado')),
  notas text, creado_en timestamptz not null default now(), unique (canal, ref_externa)
);
create index if not exists pedidos_cliente_idx on pedidos (cliente_id);
create index if not exists pedidos_punto_venta_idx on pedidos (punto_venta_id);
create table if not exists pedido_lineas (
  id uuid primary key default gen_random_uuid(), pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid not null references productos(id), cantidad integer not null check (cantidad > 0), precio_unitario numeric(12,2) not null default 0
);
create table if not exists despachos (
  id uuid primary key default gen_random_uuid(), pedido_linea_id uuid not null references pedido_lineas(id) on delete cascade,
  lote_id uuid not null references lotes(id), cantidad integer not null check (cantidad > 0), costo_unitario numeric(12,4) not null
);

create or replace function despachar_pedido(p_pedido uuid, p_asignaciones jsonb) returns void language plpgsql set search_path = __SCHEMA__, public as $$
declare v_pedido pedidos%rowtype; v_ubic uuid; a record; v_linea pedido_lineas%rowtype; v_lote lotes%rowtype; v_disp integer; v_total integer;
begin
  select * into v_pedido from pedidos where id = p_pedido for update;
  if v_pedido.estado <> 'pendiente' then raise exception 'El pedido no está pendiente'; end if;
  v_ubic := v_pedido.ubicacion_id;
  if v_ubic is null then select id into v_ubic from ubicaciones where tipo = 'almacen' and activo order by nombre limit 1; end if;
  for a in select (x->>'linea_id')::uuid as linea_id, (x->>'lote_id')::uuid as lote_id, (x->>'cantidad')::int as cantidad from jsonb_array_elements(p_asignaciones) x loop
    if a.cantidad <= 0 then continue; end if;
    select * into v_linea from pedido_lineas where id = a.linea_id and pedido_id = p_pedido;
    if v_linea.id is null then raise exception 'Línea % no pertenece al pedido', a.linea_id; end if;
    select * into v_lote from lotes where id = a.lote_id;
    if v_lote.producto_id <> v_linea.producto_id then raise exception 'El lote % no es del producto de la línea', v_lote.codigo; end if;
    select coalesce(sum(cantidad),0) into v_disp from movimientos_inv where lote_id = a.lote_id and ubicacion_id = v_ubic;
    if v_disp < a.cantidad then raise exception 'Existencias insuficientes del lote % (% disponibles)', v_lote.codigo, v_disp; end if;
    insert into despachos (pedido_linea_id, lote_id, cantidad, costo_unitario) values (a.linea_id, a.lote_id, a.cantidad, v_lote.costo_unitario);
    insert into movimientos_inv (tipo, producto_id, lote_id, ubicacion_id, cantidad, referencia_tipo, referencia_id, nota)
    values ('salida_venta', v_linea.producto_id, a.lote_id, v_ubic, -a.cantidad, 'pedido', p_pedido, 'Despacho pedido ' || coalesce(v_pedido.ref_externa, p_pedido::text));
  end loop;
  for v_linea in select * from pedido_lineas where pedido_id = p_pedido loop
    select coalesce(sum(cantidad),0) into v_total from despachos where pedido_linea_id = v_linea.id;
    if v_total <> v_linea.cantidad then raise exception 'La línea del producto no quedó cubierta (% de %)', v_total, v_linea.cantidad; end if;
  end loop;
  update pedidos set estado = 'despachado' where id = p_pedido;
end $$;

create or replace function cancelar_pedido(p_pedido uuid) returns void language plpgsql set search_path = __SCHEMA__, public as $$
declare v_pedido pedidos%rowtype; d record; v_ubic uuid;
begin
  select * into v_pedido from pedidos where id = p_pedido for update;
  if v_pedido.estado = 'cancelado' then return; end if;
  if v_pedido.estado = 'despachado' then
    v_ubic := coalesce(v_pedido.ubicacion_id, (select id from ubicaciones where tipo='almacen' and activo order by nombre limit 1));
    for d in select ds.*, pl.producto_id from despachos ds join pedido_lineas pl on pl.id = ds.pedido_linea_id where pl.pedido_id = p_pedido loop
      insert into movimientos_inv (tipo, producto_id, lote_id, ubicacion_id, cantidad, referencia_tipo, referencia_id, nota)
      values ('ajuste', d.producto_id, d.lote_id, v_ubic, d.cantidad, 'pedido', p_pedido, 'Cancelación de pedido');
    end loop;
    delete from despachos where pedido_linea_id in (select id from pedido_lineas where pedido_id = p_pedido);
  end if;
  update pedidos set estado = 'cancelado' where id = p_pedido;
end $$;

-- ---------------------------------------------------------------
-- Gastos, marketing, tareas
-- ---------------------------------------------------------------
create table if not exists gastos_marketing (
  id uuid primary key default gen_random_uuid(), fecha_inicio date not null, fecha_fin date not null, canal text not null,
  campana text, monto numeric(12,2) not null default 0, nota text, creado_en timestamptz not null default now()
);
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(), fecha date not null default current_date, categoria text not null,
  proveedor text, monto numeric(12,2) not null default 0, nota text, creado_en timestamptz not null default now()
);
create table if not exists sync_log (id uuid primary key default gen_random_uuid(), fuente text not null, ejecutado_en timestamptz not null default now(), resultado text not null, detalle jsonb);
create table if not exists tareas (
  id uuid primary key default gen_random_uuid(), titulo text not null, descripcion text,
  creado_por uuid not null references public.perfiles(id), asignado_a uuid references public.perfiles(id),
  prioridad text not null default 'media' check (prioridad in ('baja','media','alta')),
  estado text not null default 'pendiente' check (estado in ('pendiente','hecha')),
  fecha_limite date, completada_en timestamptz, creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Vistas de reporte
-- ---------------------------------------------------------------
drop view if exists resultados_mensuales; drop view if exists ventas_detalle;
create view ventas_detalle as
  select p.id as pedido_id, p.canal, p.fecha, p.estado, p.ref_externa, p.cliente_id, p.punto_venta_id,
         pl.id as linea_id, pl.producto_id, pr.nombre as producto, pl.cantidad, pl.precio_unitario,
         (pl.cantidad * pl.precio_unitario)::numeric(12,2) as venta,
         coalesce((select sum(d.cantidad * d.costo_unitario) from despachos d where d.pedido_linea_id = pl.id), 0)::numeric(12,2) as costo
  from pedidos p join pedido_lineas pl on pl.pedido_id = p.id join productos pr on pr.id = pl.producto_id
  where p.estado <> 'cancelado';
create view resultados_mensuales as
  with v as (select date_trunc('month', fecha)::date as mes, sum(venta) as ventas_brutas, sum(costo) as costo_venta from ventas_detalle group by 1),
  pd as (select date_trunc('month', fecha)::date as mes, sum(descuento) as descuentos, sum(comision_plataforma) as comisiones, sum(envio_cobrado) as envio_cobrado, sum(costo_envio) as costo_envio from pedidos where estado <> 'cancelado' group by 1),
  mk as (select date_trunc('month', fecha_inicio)::date as mes, sum(monto) as marketing from gastos_marketing group by 1),
  g as (select date_trunc('month', fecha)::date as mes, sum(monto) as gastos from gastos group by 1),
  meses as (select mes from v union select mes from pd union select mes from mk union select mes from g)
  select m.mes, coalesce(v.ventas_brutas,0)::numeric(12,2) as ventas_brutas, coalesce(pd.descuentos,0)::numeric(12,2) as descuentos,
         coalesce(pd.envio_cobrado,0)::numeric(12,2) as envio_cobrado,
         (coalesce(v.ventas_brutas,0) - coalesce(pd.descuentos,0) + coalesce(pd.envio_cobrado,0))::numeric(12,2) as ventas_netas,
         coalesce(v.costo_venta,0)::numeric(12,2) as costo_venta, coalesce(pd.comisiones,0)::numeric(12,2) as comisiones,
         coalesce(pd.costo_envio,0)::numeric(12,2) as costo_envio, coalesce(mk.marketing,0)::numeric(12,2) as marketing, coalesce(g.gastos,0)::numeric(12,2) as gastos
  from meses m left join v on v.mes = m.mes left join pd on pd.mes = m.mes left join mk on mk.mes = m.mes left join g on g.mes = m.mes
  order by m.mes desc;
create or replace view clientes_resumen as
  select c.id as cliente_id, count(p.id)::integer as pedidos, coalesce(sum(t.total),0)::numeric(12,2) as total_comprado,
         max(p.fecha) as ultima_compra, min(p.fecha) as primera_compra,
         case when max(p.fecha) is null then null else (current_date - max(p.fecha)) end as dias_sin_comprar
  from clientes c left join pedidos p on p.cliente_id = c.id and p.estado <> 'cancelado'
  left join lateral (select sum(pl.cantidad * pl.precio_unitario) - p.descuento + p.envio_cobrado as total from pedido_lineas pl where pl.pedido_id = p.id) t on true
  group by c.id;
create or replace view puntos_venta_resumen as
  select pv.id as punto_venta_id, count(p.id)::integer as pedidos, coalesce(sum(t.total),0)::numeric(12,2) as total_vendido, max(p.fecha) as ultimo_pedido,
         case when count(p.id) > 1 then round((max(p.fecha) - min(p.fecha))::numeric / (count(p.id) - 1)) end as dias_entre_pedidos,
         case when max(p.fecha) is null then null else (current_date - max(p.fecha)) end as dias_sin_pedir,
         coalesce((select sum(e.cantidad) from existencias e where e.ubicacion_id = pv.ubicacion_id), 0)::integer as inventario
  from puntos_venta pv left join pedidos p on p.punto_venta_id = pv.id and p.estado <> 'cancelado'
  left join lateral (select sum(pl.cantidad * pl.precio_unitario) - p.descuento + p.envio_cobrado as total from pedido_lineas pl where pl.pedido_id = p.id) t on true
  group by pv.id;

-- ---------------------------------------------------------------
-- Seguridad: solo miembros de la empresa
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array['productos','maquiladores','ubicaciones','lotes','lote_costos','movimientos_inv','pedidos','pedido_lineas','despachos',
                               'gastos_marketing','gastos','sync_log','clientes','puntos_venta','tareas']) loop
    execute format('alter table __SCHEMA__.%I enable row level security', t);
    execute format('drop policy if exists "miembros_todo" on __SCHEMA__.%I', t);
    execute format('create policy "miembros_todo" on __SCHEMA__.%I for all to authenticated using (public.es_miembro(''__SCHEMA__'')) with check (public.es_miembro(''__SCHEMA__''))', t);
  end loop;
end $$;

grant usage on schema __SCHEMA__ to authenticated, anon;
grant select, insert, update, delete on all tables in schema __SCHEMA__ to authenticated;
grant select on existencias, ventas_detalle, resultados_mensuales, clientes_resumen, puntos_venta_resumen to authenticated;
revoke execute on all functions in schema __SCHEMA__ from public, anon;
grant execute on function recibir_lote(uuid), trasladar_inventario(uuid,uuid,uuid,integer,text), despachar_pedido(uuid,jsonb), cancelar_pedido(uuid), recalcular_costo_lote(uuid), crear_punto_venta(jsonb) to authenticated;

-- Ubicaciones iniciales
insert into ubicaciones (nombre, tipo) values ('Almacén', 'almacen'), ('Merma', 'merma') on conflict (nombre) do nothing;

reset search_path;
