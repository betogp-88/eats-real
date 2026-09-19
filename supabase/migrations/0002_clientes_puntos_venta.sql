-- Fase 1.5: clientes (CRM ligero) y puntos de venta.
-- Ejecutar COMPLETO en el SQL Editor de Supabase después de 0001.

-- ---------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------
create table if not exists clientes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  telefono      text,
  email         text,
  direccion     text,
  canal_origen  text,
  notas         text,
  creado_en     timestamptz not null default now()
);
create index if not exists clientes_nombre_idx on clientes (lower(nombre));
create index if not exists clientes_telefono_idx on clientes (telefono);

-- ---------------------------------------------------------------
-- Puntos de venta (tiendas). Cada uno tiene su ubicación de inventario
-- cuando trabaja a consignación.
-- ---------------------------------------------------------------
create table if not exists puntos_venta (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  contacto      text,
  telefono      text,
  email         text,
  direccion     text,
  modalidad     text not null default 'consignacion' check (modalidad in ('consignacion','directa')),
  ubicacion_id  uuid references ubicaciones(id),
  notas         text,
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- Crea un punto de venta y, si es a consignación, su ubicación de inventario
create or replace function crear_punto_venta(p_datos jsonb) returns uuid language plpgsql as $$
declare v_ubic uuid; v_id uuid; v_nombre text := p_datos->>'nombre';
begin
  if coalesce(p_datos->>'modalidad','consignacion') = 'consignacion' then
    insert into ubicaciones (nombre, tipo) values (v_nombre, 'consignacion')
    on conflict (nombre) do update set activo = true, tipo = 'consignacion'
    returning id into v_ubic;
  end if;
  insert into puntos_venta (nombre, contacto, telefono, email, direccion, modalidad, ubicacion_id, notas)
  values (v_nombre, p_datos->>'contacto', p_datos->>'telefono', p_datos->>'email', p_datos->>'direccion',
          coalesce(p_datos->>'modalidad','consignacion'), v_ubic, p_datos->>'notas')
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------
-- Pedidos: canal punto_venta y referencias a cliente / punto de venta
-- ---------------------------------------------------------------
alter table pedidos drop constraint if exists pedidos_canal_check;
alter table pedidos add constraint pedidos_canal_check
  check (canal in ('shopify','amazon','directa','consignacion','punto_venta'));
alter table pedidos add column if not exists cliente_id uuid references clientes(id);
alter table pedidos add column if not exists punto_venta_id uuid references puntos_venta(id);
create index if not exists pedidos_cliente_idx on pedidos (cliente_id);
create index if not exists pedidos_punto_venta_idx on pedidos (punto_venta_id);

-- Migra pedidos antiguos de consignación a puntos de venta con la misma ubicación
insert into puntos_venta (nombre, modalidad, ubicacion_id)
  select u.nombre, 'consignacion', u.id from ubicaciones u
  where u.tipo = 'consignacion' and not exists (select 1 from puntos_venta pv where pv.ubicacion_id = u.id)
on conflict (nombre) do nothing;
update pedidos p set canal = 'punto_venta', punto_venta_id = pv.id
  from puntos_venta pv where p.canal = 'consignacion' and p.ubicacion_id = pv.ubicacion_id;

-- ---------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------
drop view if exists resultados_mensuales;
drop view if exists ventas_detalle;
create view ventas_detalle as
  select p.id as pedido_id, p.canal, p.fecha, p.estado, p.ref_externa, p.cliente_id, p.punto_venta_id,
         pl.id as linea_id, pl.producto_id, pr.nombre as producto,
         pl.cantidad, pl.precio_unitario,
         (pl.cantidad * pl.precio_unitario)::numeric(12,2) as venta,
         coalesce((select sum(d.cantidad * d.costo_unitario) from despachos d where d.pedido_linea_id = pl.id), 0)::numeric(12,2) as costo
  from pedidos p
  join pedido_lineas pl on pl.pedido_id = p.id
  join productos pr on pr.id = pl.producto_id
  where p.estado <> 'cancelado';

create view resultados_mensuales as
  with v as (
    select date_trunc('month', fecha)::date as mes, sum(venta) as ventas_brutas, sum(costo) as costo_venta
    from ventas_detalle group by 1
  ), pd as (
    select date_trunc('month', fecha)::date as mes, sum(descuento) as descuentos, sum(comision_plataforma) as comisiones,
           sum(envio_cobrado) as envio_cobrado, sum(costo_envio) as costo_envio
    from pedidos where estado <> 'cancelado' group by 1
  ), mk as (select date_trunc('month', fecha_inicio)::date as mes, sum(monto) as marketing from gastos_marketing group by 1
  ), g as (select date_trunc('month', fecha)::date as mes, sum(monto) as gastos from gastos group by 1
  ), meses as (select mes from v union select mes from pd union select mes from mk union select mes from g)
  select m.mes,
         coalesce(v.ventas_brutas,0)::numeric(12,2) as ventas_brutas,
         coalesce(pd.descuentos,0)::numeric(12,2) as descuentos,
         coalesce(pd.envio_cobrado,0)::numeric(12,2) as envio_cobrado,
         (coalesce(v.ventas_brutas,0) - coalesce(pd.descuentos,0) + coalesce(pd.envio_cobrado,0))::numeric(12,2) as ventas_netas,
         coalesce(v.costo_venta,0)::numeric(12,2) as costo_venta,
         coalesce(pd.comisiones,0)::numeric(12,2) as comisiones,
         coalesce(pd.costo_envio,0)::numeric(12,2) as costo_envio,
         coalesce(mk.marketing,0)::numeric(12,2) as marketing,
         coalesce(g.gastos,0)::numeric(12,2) as gastos
  from meses m
  left join v on v.mes = m.mes left join pd on pd.mes = m.mes
  left join mk on mk.mes = m.mes left join g on g.mes = m.mes
  order by m.mes desc;

-- Resumen por cliente
create or replace view clientes_resumen as
  select c.id as cliente_id,
         count(p.id)::integer as pedidos,
         coalesce(sum(t.total),0)::numeric(12,2) as total_comprado,
         max(p.fecha) as ultima_compra,
         min(p.fecha) as primera_compra,
         case when max(p.fecha) is null then null else (current_date - max(p.fecha)) end as dias_sin_comprar
  from clientes c
  left join pedidos p on p.cliente_id = c.id and p.estado <> 'cancelado'
  left join lateral (
    select sum(pl.cantidad * pl.precio_unitario) - p.descuento + p.envio_cobrado as total
    from pedido_lineas pl where pl.pedido_id = p.id
  ) t on true
  group by c.id;

-- Resumen por punto de venta
create or replace view puntos_venta_resumen as
  select pv.id as punto_venta_id,
         count(p.id)::integer as pedidos,
         coalesce(sum(t.total),0)::numeric(12,2) as total_vendido,
         max(p.fecha) as ultimo_pedido,
         case when count(p.id) > 1 then round((max(p.fecha) - min(p.fecha))::numeric / (count(p.id) - 1)) end as dias_entre_pedidos,
         case when max(p.fecha) is null then null else (current_date - max(p.fecha)) end as dias_sin_pedir,
         coalesce((select sum(e.cantidad) from existencias e where e.ubicacion_id = pv.ubicacion_id), 0)::integer as inventario
  from puntos_venta pv
  left join pedidos p on p.punto_venta_id = pv.id and p.estado <> 'cancelado'
  left join lateral (
    select sum(pl.cantidad * pl.precio_unitario) - p.descuento + p.envio_cobrado as total
    from pedido_lineas pl where pl.pedido_id = p.id
  ) t on true
  group by pv.id;

-- ---------------------------------------------------------------
-- Seguridad y permisos
-- ---------------------------------------------------------------
alter table clientes enable row level security;
alter table puntos_venta enable row level security;
drop policy if exists "autenticados_todo" on clientes;
drop policy if exists "autenticados_todo" on puntos_venta;
create policy "autenticados_todo" on clientes for all to authenticated using (true) with check (true);
create policy "autenticados_todo" on puntos_venta for all to authenticated using (true) with check (true);
grant select, insert, update, delete on clientes, puntos_venta to authenticated;
grant select on ventas_detalle, resultados_mensuales, clientes_resumen, puntos_venta_resumen to authenticated;
revoke execute on function crear_punto_venta(jsonb) from public, anon;
grant execute on function crear_punto_venta(jsonb) to authenticated;
