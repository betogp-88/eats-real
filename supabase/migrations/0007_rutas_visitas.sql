-- Rutas, visitas y cobros. Ejecutar COMPLETO después de volver a correr 0004 (agrega roles) y de 0006.
-- Aplica a public (Eats Real) y a maix.

-- ===== Rutas, visitas y cobros (bloque por esquema; public = public | maix | ...) =====
set search_path to public, public;

-- Rutas
create table if not exists rutas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  dia_semana smallint check (dia_semana between 0 and 6),   -- 0 domingo … 6 sábado; null = sin día fijo
  cada_semanas smallint not null default 1 check (cada_semanas between 1 and 8),
  responsable_id uuid references public.perfiles(id),
  notas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table puntos_venta add column if not exists ruta_id uuid references rutas(id);
alter table puntos_venta add column if not exists orden integer;
create index if not exists puntos_venta_ruta_idx on puntos_venta (ruta_id, orden);

-- Migra "zona" (texto) a rutas y elimina la columna
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'puntos_venta' and column_name = 'zona') then
    insert into rutas (nombre) select distinct zona from puntos_venta where zona is not null and zona <> '' on conflict (nombre) do nothing;
    update puntos_venta pv set ruta_id = r.id from rutas r where pv.zona = r.nombre and pv.ruta_id is null;
    alter table puntos_venta drop column zona;
  end if;
end $$;

-- Alta de punto de venta con ruta (sustituye a la versión con "zona")
create or replace function crear_punto_venta(p_datos jsonb) returns uuid language plpgsql set search_path = public, public as $$
declare v_ubic uuid; v_id uuid; v_nombre text := p_datos->>'nombre';
begin
  if coalesce(p_datos->>'modalidad','consignacion') = 'consignacion' then
    insert into ubicaciones (nombre, tipo) values (v_nombre, 'consignacion')
    on conflict (nombre) do update set activo = true, tipo = 'consignacion' returning id into v_ubic;
  end if;
  insert into puntos_venta (nombre, contacto, telefono, email, direccion, modalidad, ubicacion_id, ruta_id, orden, notas)
  values (v_nombre, p_datos->>'contacto', p_datos->>'telefono', p_datos->>'email', p_datos->>'direccion', coalesce(p_datos->>'modalidad','consignacion'), v_ubic,
          nullif(p_datos->>'ruta_id','')::uuid, nullif(p_datos->>'orden','')::int, p_datos->>'notas')
  returning id into v_id;
  return v_id;
end $$;

-- Pago de pedidos (cuentas por cobrar por tienda)
alter table pedidos add column if not exists pago_estado text not null default 'pagado' check (pago_estado in ('pagado','pendiente'));
alter table pedidos add column if not exists pago_metodo text check (pago_metodo in ('efectivo','transferencia','tarjeta','plataforma','otro'));
alter table pedidos add column if not exists pagado_en timestamptz;

-- Visitas
create table if not exists visitas (
  id uuid primary key default gen_random_uuid(),
  punto_venta_id uuid not null references puntos_venta(id),
  ruta_id uuid references rutas(id),
  fecha timestamptz not null default now(),
  usuario_id uuid references public.perfiles(id),
  resultado text not null default 'venta' check (resultado in ('venta','sin_pedido','cerrada','no_encontrada','ya_no_vende')),
  pedido_id uuid references pedidos(id),
  cobro_monto numeric(12,2) not null default 0,
  cobro_metodo text check (cobro_metodo in ('efectivo','transferencia','pendiente')),
  repuesto integer not null default 0,
  vendido integer not null default 0,
  fotos text[] not null default '{}',
  notas text,
  creado_en timestamptz not null default now()
);
create index if not exists visitas_pv_idx on visitas (punto_venta_id, fecha desc);
create index if not exists visitas_fecha_idx on visitas (fecha desc);

-- FIFO: reparte una cantidad de un producto entre los lotes de una ubicación (caducidad más próxima primero)
create or replace function asignar_fifo(p_producto uuid, p_ubic uuid, p_cantidad integer)
returns jsonb language plpgsql set search_path = public, public as $$
declare r record; v_falta integer := p_cantidad; v_out jsonb := '[]'::jsonb; v_q integer;
begin
  for r in select e.lote_id, e.cantidad from existencias e join lotes l on l.id = e.lote_id
           where e.producto_id = p_producto and e.ubicacion_id = p_ubic and e.cantidad > 0
           order by l.fecha_caducidad nulls last, l.fecha_produccion loop
    exit when v_falta <= 0;
    v_q := least(v_falta, r.cantidad);
    v_out := v_out || jsonb_build_object('lote_id', r.lote_id, 'cantidad', v_q);
    v_falta := v_falta - v_q;
  end loop;
  if v_falta > 0 then
    raise exception 'Existencias insuficientes: faltan % de %', v_falta, (select nombre from productos where id = p_producto);
  end if;
  return v_out;
end $$;

-- Registra una visita completa: conteo → venta, ajuste, reposición, cobro y fotos.
-- p: { punto_venta_id, ruta_id?, resultado, notas?, fotos?: [], cobro_monto?, cobro_metodo?,
--      lineas: [{ producto_id, contadas?: n, dejo?: n, precio?: n }] }
create or replace function registrar_visita(p jsonb) returns uuid language plpgsql set search_path = public, public as $$
declare
  v_pv puntos_venta%rowtype; v_visita uuid; v_pedido uuid; v_almacen uuid; l record;
  v_stock integer; v_vendido integer; v_tot_vendido integer := 0; v_tot_repuesto integer := 0;
  v_lote uuid; a jsonb; v_asig jsonb := '[]'::jsonb; v_linea uuid; v_precio numeric(12,2); v_metodo text;
begin
  select * into v_pv from puntos_venta where id = (p->>'punto_venta_id')::uuid;
  if v_pv.id is null then raise exception 'Punto de venta no encontrado'; end if;
  select id into v_almacen from ubicaciones where tipo = 'almacen' and activo order by nombre limit 1;
  v_metodo := nullif(p->>'cobro_metodo','');

  insert into visitas (punto_venta_id, ruta_id, usuario_id, resultado, cobro_monto, cobro_metodo, fotos, notas)
  values (v_pv.id, nullif(p->>'ruta_id','')::uuid, auth.uid(), coalesce(p->>'resultado','venta'),
          coalesce((p->>'cobro_monto')::numeric, 0), v_metodo,
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'fotos','[]'::jsonb)) x), '{}'),
          nullif(p->>'notas',''))
  returning id into v_visita;

  -- 1) Venta: consignación = lo que faltó contra el conteo; directa = lo que se entrega
  for l in select (x->>'producto_id')::uuid as producto_id, (x->>'contadas')::int as contadas, coalesce((x->>'dejo')::int, 0) as dejo,
                  (x->>'precio')::numeric as precio
           from jsonb_array_elements(coalesce(p->'lineas','[]'::jsonb)) x loop
    if v_pv.modalidad = 'consignacion' then
      if l.contadas is null then continue; end if;
      select coalesce(sum(cantidad),0) into v_stock from existencias where producto_id = l.producto_id and ubicacion_id = v_pv.ubicacion_id;
      v_vendido := greatest(v_stock - l.contadas, 0);
      if l.contadas > v_stock then
        -- Había más de lo registrado: ajuste positivo sobre el último lote conocido del producto en la tienda
        select lote_id into v_lote from movimientos_inv where producto_id = l.producto_id and ubicacion_id = v_pv.ubicacion_id order by fecha desc limit 1;
        if v_lote is null then select id into v_lote from lotes where producto_id = l.producto_id order by fecha_produccion desc limit 1; end if;
        if v_lote is not null then
          insert into movimientos_inv (tipo, producto_id, lote_id, ubicacion_id, cantidad, referencia_tipo, referencia_id, nota)
          values ('ajuste', l.producto_id, v_lote, v_pv.ubicacion_id, l.contadas - v_stock, 'visita', v_visita, 'Conteo en visita: había más de lo registrado');
        end if;
      end if;
    else
      v_vendido := l.dejo;
    end if;

    if v_vendido > 0 then
      if v_pedido is null then
        insert into pedidos (canal, punto_venta_id, ubicacion_id, cliente_nombre, fecha, pago_estado, pago_metodo, notas)
        values ('punto_venta', v_pv.id, case when v_pv.modalidad = 'consignacion' then v_pv.ubicacion_id else null end, v_pv.nombre, current_date,
                case when v_metodo = 'pendiente' or v_metodo is null then 'pendiente' else 'pagado' end,
                case when v_metodo in ('efectivo','transferencia') then v_metodo else null end,
                'Registrado en visita')
        returning id into v_pedido;
      end if;
      select coalesce(l.precio, precio_lista) into v_precio from productos where id = l.producto_id;
      insert into pedido_lineas (pedido_id, producto_id, cantidad, precio_unitario) values (v_pedido, l.producto_id, v_vendido, v_precio) returning id into v_linea;
      for a in select * from jsonb_array_elements(asignar_fifo(l.producto_id, case when v_pv.modalidad = 'consignacion' then v_pv.ubicacion_id else v_almacen end, v_vendido)) loop
        v_asig := v_asig || jsonb_build_object('linea_id', v_linea, 'lote_id', a->>'lote_id', 'cantidad', (a->>'cantidad')::int);
      end loop;
      v_tot_vendido := v_tot_vendido + v_vendido;
    end if;
  end loop;
  if v_pedido is not null then
    perform despachar_pedido(v_pedido, v_asig);
    update pedidos set pagado_en = case when pago_estado = 'pagado' then now() end where id = v_pedido;
  end if;

  -- 2) Reposición (solo consignación): traslado almacén → tienda, FIFO
  if v_pv.modalidad = 'consignacion' then
    for l in select (x->>'producto_id')::uuid as producto_id, coalesce((x->>'dejo')::int, 0) as dejo
             from jsonb_array_elements(coalesce(p->'lineas','[]'::jsonb)) x where coalesce((x->>'dejo')::int, 0) > 0 loop
      for a in select * from jsonb_array_elements(asignar_fifo(l.producto_id, v_almacen, l.dejo)) loop
        perform trasladar_inventario((a->>'lote_id')::uuid, v_almacen, v_pv.ubicacion_id, (a->>'cantidad')::int, 'Reposición en visita');
      end loop;
      v_tot_repuesto := v_tot_repuesto + l.dejo;
    end loop;
  end if;

  update visitas set pedido_id = v_pedido, vendido = v_tot_vendido, repuesto = v_tot_repuesto where id = v_visita;
  return v_visita;
end $$;

-- Marcar pedido como pagado / pendiente
create or replace function marcar_pago(p_pedido uuid, p_estado text, p_metodo text default null) returns void
language plpgsql set search_path = public, public as $$
begin
  update pedidos set pago_estado = p_estado, pago_metodo = coalesce(p_metodo, pago_metodo), pagado_en = case when p_estado = 'pagado' then now() else null end where id = p_pedido;
end $$;

-- Vistas (todas con security_invoker para que respeten membresías)
drop view if exists public.puntos_venta_resumen;
create view public.puntos_venta_resumen with (security_invoker = true) as
  select pv.id as punto_venta_id,
         count(p.id)::integer as pedidos,
         coalesce(sum(t.total),0)::numeric(12,2) as total_vendido,
         coalesce(sum(t.total) filter (where p.pago_estado = 'pendiente'),0)::numeric(12,2) as saldo_pendiente,
         max(p.fecha) as ultimo_pedido,
         case when count(p.id) > 1 then round((max(p.fecha) - min(p.fecha))::numeric / (count(p.id) - 1)) end as dias_entre_pedidos,
         case when max(p.fecha) is null then null else (current_date - max(p.fecha)) end as dias_sin_pedir,
         (select max(v.fecha) from visitas v where v.punto_venta_id = pv.id) as ultima_visita,
         coalesce((select sum(e.cantidad) from existencias e where e.ubicacion_id = pv.ubicacion_id), 0)::integer as inventario
  from puntos_venta pv
  left join pedidos p on p.punto_venta_id = pv.id and p.estado <> 'cancelado'
  left join lateral (select sum(pl.cantidad * pl.precio_unitario) - p.descuento + p.envio_cobrado as total from pedido_lineas pl where pl.pedido_id = p.id) t on true
  group by pv.id;

create or replace view rutas_resumen with (security_invoker = true) as
  select r.id as ruta_id,
         (select count(*) from puntos_venta pv where pv.ruta_id = r.id and pv.activo)::integer as tiendas,
         (select count(distinct v.punto_venta_id) from visitas v join puntos_venta pv on pv.id = v.punto_venta_id
            where pv.ruta_id = r.id and v.fecha::date = current_date)::integer as visitadas_hoy,
         (select max(v.fecha) from visitas v where v.ruta_id = r.id) as ultima_salida
  from rutas r;

alter view public.existencias set (security_invoker = true);
alter view public.clientes_resumen set (security_invoker = true);
-- Se recrean (una versión anterior de la plantilla las borraba de public por accidente)
drop view if exists public.resultados_mensuales; drop view if exists public.ventas_detalle;
create view public.ventas_detalle with (security_invoker = true) as
  select p.id as pedido_id, p.canal, p.fecha, p.estado, p.ref_externa, p.cliente_id, p.punto_venta_id,
         pl.id as linea_id, pl.producto_id, pr.nombre as producto, pl.cantidad, pl.precio_unitario,
         (pl.cantidad * pl.precio_unitario)::numeric(12,2) as venta,
         coalesce((select sum(d.cantidad * d.costo_unitario) from despachos d where d.pedido_linea_id = pl.id), 0)::numeric(12,2) as costo
  from pedidos p join pedido_lineas pl on pl.pedido_id = p.id join productos pr on pr.id = pl.producto_id
  where p.estado <> 'cancelado';
create view public.resultados_mensuales with (security_invoker = true) as
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
grant select on public.ventas_detalle, public.resultados_mensuales to authenticated;

-- Seguridad
alter table rutas enable row level security;
alter table visitas enable row level security;
drop policy if exists "miembros_todo" on rutas;   create policy "miembros_todo" on rutas   for all to authenticated using (public.es_miembro('eats_real')) with check (public.es_miembro('eats_real'));
drop policy if exists "miembros_todo" on visitas; create policy "miembros_todo" on visitas for all to authenticated using (public.es_miembro('eats_real')) with check (public.es_miembro('eats_real'));
-- Finanzas y producción: solo administradores
do $$
declare t text;
begin
  for t in select unnest(array['gastos','gastos_marketing','lote_costos','lotes','maquiladores','sync_log']) loop
    execute format('drop policy if exists "miembros_todo" on public.%I', t);
    execute format('drop policy if exists "admins_todo" on public.%I', t);
    execute format('create policy "admins_todo" on public.%I for all to authenticated using (public.es_admin(''eats_real'')) with check (public.es_admin(''eats_real''))', t);
  end loop;
  -- Rutas puede leer lotes (para despachar) pero no escribirlos
  execute 'drop policy if exists "miembros_leen" on public.lotes';
  execute 'create policy "miembros_leen" on public.lotes for select to authenticated using (public.es_miembro(''eats_real''))';
end $$;
grant select, insert, update, delete on rutas, visitas to authenticated;
grant select on rutas_resumen, puntos_venta_resumen to authenticated;
revoke execute on function asignar_fifo(uuid,uuid,integer), registrar_visita(jsonb), marcar_pago(uuid,text,text) from public, anon;
grant execute on function asignar_fifo(uuid,uuid,integer), registrar_visita(jsonb), marcar_pago(uuid,text,text) to authenticated;

reset search_path;

-- ===== Rutas, visitas y cobros (bloque por esquema; maix = public | maix | ...) =====
set search_path to maix, public;

-- Rutas
create table if not exists rutas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  dia_semana smallint check (dia_semana between 0 and 6),   -- 0 domingo … 6 sábado; null = sin día fijo
  cada_semanas smallint not null default 1 check (cada_semanas between 1 and 8),
  responsable_id uuid references public.perfiles(id),
  notas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table puntos_venta add column if not exists ruta_id uuid references rutas(id);
alter table puntos_venta add column if not exists orden integer;
create index if not exists puntos_venta_ruta_idx on puntos_venta (ruta_id, orden);

-- Migra "zona" (texto) a rutas y elimina la columna
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'maix' and table_name = 'puntos_venta' and column_name = 'zona') then
    insert into rutas (nombre) select distinct zona from puntos_venta where zona is not null and zona <> '' on conflict (nombre) do nothing;
    update puntos_venta pv set ruta_id = r.id from rutas r where pv.zona = r.nombre and pv.ruta_id is null;
    alter table puntos_venta drop column zona;
  end if;
end $$;

-- Alta de punto de venta con ruta (sustituye a la versión con "zona")
create or replace function crear_punto_venta(p_datos jsonb) returns uuid language plpgsql set search_path = maix, public as $$
declare v_ubic uuid; v_id uuid; v_nombre text := p_datos->>'nombre';
begin
  if coalesce(p_datos->>'modalidad','consignacion') = 'consignacion' then
    insert into ubicaciones (nombre, tipo) values (v_nombre, 'consignacion')
    on conflict (nombre) do update set activo = true, tipo = 'consignacion' returning id into v_ubic;
  end if;
  insert into puntos_venta (nombre, contacto, telefono, email, direccion, modalidad, ubicacion_id, ruta_id, orden, notas)
  values (v_nombre, p_datos->>'contacto', p_datos->>'telefono', p_datos->>'email', p_datos->>'direccion', coalesce(p_datos->>'modalidad','consignacion'), v_ubic,
          nullif(p_datos->>'ruta_id','')::uuid, nullif(p_datos->>'orden','')::int, p_datos->>'notas')
  returning id into v_id;
  return v_id;
end $$;

-- Pago de pedidos (cuentas por cobrar por tienda)
alter table pedidos add column if not exists pago_estado text not null default 'pagado' check (pago_estado in ('pagado','pendiente'));
alter table pedidos add column if not exists pago_metodo text check (pago_metodo in ('efectivo','transferencia','tarjeta','plataforma','otro'));
alter table pedidos add column if not exists pagado_en timestamptz;

-- Visitas
create table if not exists visitas (
  id uuid primary key default gen_random_uuid(),
  punto_venta_id uuid not null references puntos_venta(id),
  ruta_id uuid references rutas(id),
  fecha timestamptz not null default now(),
  usuario_id uuid references public.perfiles(id),
  resultado text not null default 'venta' check (resultado in ('venta','sin_pedido','cerrada','no_encontrada','ya_no_vende')),
  pedido_id uuid references pedidos(id),
  cobro_monto numeric(12,2) not null default 0,
  cobro_metodo text check (cobro_metodo in ('efectivo','transferencia','pendiente')),
  repuesto integer not null default 0,
  vendido integer not null default 0,
  fotos text[] not null default '{}',
  notas text,
  creado_en timestamptz not null default now()
);
create index if not exists visitas_pv_idx on visitas (punto_venta_id, fecha desc);
create index if not exists visitas_fecha_idx on visitas (fecha desc);

-- FIFO: reparte una cantidad de un producto entre los lotes de una ubicación (caducidad más próxima primero)
create or replace function asignar_fifo(p_producto uuid, p_ubic uuid, p_cantidad integer)
returns jsonb language plpgsql set search_path = maix, public as $$
declare r record; v_falta integer := p_cantidad; v_out jsonb := '[]'::jsonb; v_q integer;
begin
  for r in select e.lote_id, e.cantidad from existencias e join lotes l on l.id = e.lote_id
           where e.producto_id = p_producto and e.ubicacion_id = p_ubic and e.cantidad > 0
           order by l.fecha_caducidad nulls last, l.fecha_produccion loop
    exit when v_falta <= 0;
    v_q := least(v_falta, r.cantidad);
    v_out := v_out || jsonb_build_object('lote_id', r.lote_id, 'cantidad', v_q);
    v_falta := v_falta - v_q;
  end loop;
  if v_falta > 0 then
    raise exception 'Existencias insuficientes: faltan % de %', v_falta, (select nombre from productos where id = p_producto);
  end if;
  return v_out;
end $$;

-- Registra una visita completa: conteo → venta, ajuste, reposición, cobro y fotos.
-- p: { punto_venta_id, ruta_id?, resultado, notas?, fotos?: [], cobro_monto?, cobro_metodo?,
--      lineas: [{ producto_id, contadas?: n, dejo?: n, precio?: n }] }
create or replace function registrar_visita(p jsonb) returns uuid language plpgsql set search_path = maix, public as $$
declare
  v_pv puntos_venta%rowtype; v_visita uuid; v_pedido uuid; v_almacen uuid; l record;
  v_stock integer; v_vendido integer; v_tot_vendido integer := 0; v_tot_repuesto integer := 0;
  v_lote uuid; a jsonb; v_asig jsonb := '[]'::jsonb; v_linea uuid; v_precio numeric(12,2); v_metodo text;
begin
  select * into v_pv from puntos_venta where id = (p->>'punto_venta_id')::uuid;
  if v_pv.id is null then raise exception 'Punto de venta no encontrado'; end if;
  select id into v_almacen from ubicaciones where tipo = 'almacen' and activo order by nombre limit 1;
  v_metodo := nullif(p->>'cobro_metodo','');

  insert into visitas (punto_venta_id, ruta_id, usuario_id, resultado, cobro_monto, cobro_metodo, fotos, notas)
  values (v_pv.id, nullif(p->>'ruta_id','')::uuid, auth.uid(), coalesce(p->>'resultado','venta'),
          coalesce((p->>'cobro_monto')::numeric, 0), v_metodo,
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'fotos','[]'::jsonb)) x), '{}'),
          nullif(p->>'notas',''))
  returning id into v_visita;

  -- 1) Venta: consignación = lo que faltó contra el conteo; directa = lo que se entrega
  for l in select (x->>'producto_id')::uuid as producto_id, (x->>'contadas')::int as contadas, coalesce((x->>'dejo')::int, 0) as dejo,
                  (x->>'precio')::numeric as precio
           from jsonb_array_elements(coalesce(p->'lineas','[]'::jsonb)) x loop
    if v_pv.modalidad = 'consignacion' then
      if l.contadas is null then continue; end if;
      select coalesce(sum(cantidad),0) into v_stock from existencias where producto_id = l.producto_id and ubicacion_id = v_pv.ubicacion_id;
      v_vendido := greatest(v_stock - l.contadas, 0);
      if l.contadas > v_stock then
        -- Había más de lo registrado: ajuste positivo sobre el último lote conocido del producto en la tienda
        select lote_id into v_lote from movimientos_inv where producto_id = l.producto_id and ubicacion_id = v_pv.ubicacion_id order by fecha desc limit 1;
        if v_lote is null then select id into v_lote from lotes where producto_id = l.producto_id order by fecha_produccion desc limit 1; end if;
        if v_lote is not null then
          insert into movimientos_inv (tipo, producto_id, lote_id, ubicacion_id, cantidad, referencia_tipo, referencia_id, nota)
          values ('ajuste', l.producto_id, v_lote, v_pv.ubicacion_id, l.contadas - v_stock, 'visita', v_visita, 'Conteo en visita: había más de lo registrado');
        end if;
      end if;
    else
      v_vendido := l.dejo;
    end if;

    if v_vendido > 0 then
      if v_pedido is null then
        insert into pedidos (canal, punto_venta_id, ubicacion_id, cliente_nombre, fecha, pago_estado, pago_metodo, notas)
        values ('punto_venta', v_pv.id, case when v_pv.modalidad = 'consignacion' then v_pv.ubicacion_id else null end, v_pv.nombre, current_date,
                case when v_metodo = 'pendiente' or v_metodo is null then 'pendiente' else 'pagado' end,
                case when v_metodo in ('efectivo','transferencia') then v_metodo else null end,
                'Registrado en visita')
        returning id into v_pedido;
      end if;
      select coalesce(l.precio, precio_lista) into v_precio from productos where id = l.producto_id;
      insert into pedido_lineas (pedido_id, producto_id, cantidad, precio_unitario) values (v_pedido, l.producto_id, v_vendido, v_precio) returning id into v_linea;
      for a in select * from jsonb_array_elements(asignar_fifo(l.producto_id, case when v_pv.modalidad = 'consignacion' then v_pv.ubicacion_id else v_almacen end, v_vendido)) loop
        v_asig := v_asig || jsonb_build_object('linea_id', v_linea, 'lote_id', a->>'lote_id', 'cantidad', (a->>'cantidad')::int);
      end loop;
      v_tot_vendido := v_tot_vendido + v_vendido;
    end if;
  end loop;
  if v_pedido is not null then
    perform despachar_pedido(v_pedido, v_asig);
    update pedidos set pagado_en = case when pago_estado = 'pagado' then now() end where id = v_pedido;
  end if;

  -- 2) Reposición (solo consignación): traslado almacén → tienda, FIFO
  if v_pv.modalidad = 'consignacion' then
    for l in select (x->>'producto_id')::uuid as producto_id, coalesce((x->>'dejo')::int, 0) as dejo
             from jsonb_array_elements(coalesce(p->'lineas','[]'::jsonb)) x where coalesce((x->>'dejo')::int, 0) > 0 loop
      for a in select * from jsonb_array_elements(asignar_fifo(l.producto_id, v_almacen, l.dejo)) loop
        perform trasladar_inventario((a->>'lote_id')::uuid, v_almacen, v_pv.ubicacion_id, (a->>'cantidad')::int, 'Reposición en visita');
      end loop;
      v_tot_repuesto := v_tot_repuesto + l.dejo;
    end loop;
  end if;

  update visitas set pedido_id = v_pedido, vendido = v_tot_vendido, repuesto = v_tot_repuesto where id = v_visita;
  return v_visita;
end $$;

-- Marcar pedido como pagado / pendiente
create or replace function marcar_pago(p_pedido uuid, p_estado text, p_metodo text default null) returns void
language plpgsql set search_path = maix, public as $$
begin
  update pedidos set pago_estado = p_estado, pago_metodo = coalesce(p_metodo, pago_metodo), pagado_en = case when p_estado = 'pagado' then now() else null end where id = p_pedido;
end $$;

-- Vistas (todas con security_invoker para que respeten membresías)
drop view if exists maix.puntos_venta_resumen;
create view maix.puntos_venta_resumen with (security_invoker = true) as
  select pv.id as punto_venta_id,
         count(p.id)::integer as pedidos,
         coalesce(sum(t.total),0)::numeric(12,2) as total_vendido,
         coalesce(sum(t.total) filter (where p.pago_estado = 'pendiente'),0)::numeric(12,2) as saldo_pendiente,
         max(p.fecha) as ultimo_pedido,
         case when count(p.id) > 1 then round((max(p.fecha) - min(p.fecha))::numeric / (count(p.id) - 1)) end as dias_entre_pedidos,
         case when max(p.fecha) is null then null else (current_date - max(p.fecha)) end as dias_sin_pedir,
         (select max(v.fecha) from visitas v where v.punto_venta_id = pv.id) as ultima_visita,
         coalesce((select sum(e.cantidad) from existencias e where e.ubicacion_id = pv.ubicacion_id), 0)::integer as inventario
  from puntos_venta pv
  left join pedidos p on p.punto_venta_id = pv.id and p.estado <> 'cancelado'
  left join lateral (select sum(pl.cantidad * pl.precio_unitario) - p.descuento + p.envio_cobrado as total from pedido_lineas pl where pl.pedido_id = p.id) t on true
  group by pv.id;

create or replace view rutas_resumen with (security_invoker = true) as
  select r.id as ruta_id,
         (select count(*) from puntos_venta pv where pv.ruta_id = r.id and pv.activo)::integer as tiendas,
         (select count(distinct v.punto_venta_id) from visitas v join puntos_venta pv on pv.id = v.punto_venta_id
            where pv.ruta_id = r.id and v.fecha::date = current_date)::integer as visitadas_hoy,
         (select max(v.fecha) from visitas v where v.ruta_id = r.id) as ultima_salida
  from rutas r;

alter view maix.existencias set (security_invoker = true);
alter view maix.clientes_resumen set (security_invoker = true);
-- Se recrean (una versión anterior de la plantilla las borraba de public por accidente)
drop view if exists maix.resultados_mensuales; drop view if exists maix.ventas_detalle;
create view maix.ventas_detalle with (security_invoker = true) as
  select p.id as pedido_id, p.canal, p.fecha, p.estado, p.ref_externa, p.cliente_id, p.punto_venta_id,
         pl.id as linea_id, pl.producto_id, pr.nombre as producto, pl.cantidad, pl.precio_unitario,
         (pl.cantidad * pl.precio_unitario)::numeric(12,2) as venta,
         coalesce((select sum(d.cantidad * d.costo_unitario) from despachos d where d.pedido_linea_id = pl.id), 0)::numeric(12,2) as costo
  from pedidos p join pedido_lineas pl on pl.pedido_id = p.id join productos pr on pr.id = pl.producto_id
  where p.estado <> 'cancelado';
create view maix.resultados_mensuales with (security_invoker = true) as
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
grant select on maix.ventas_detalle, maix.resultados_mensuales to authenticated;

-- Seguridad
alter table rutas enable row level security;
alter table visitas enable row level security;
drop policy if exists "miembros_todo" on rutas;   create policy "miembros_todo" on rutas   for all to authenticated using (public.es_miembro('maix')) with check (public.es_miembro('maix'));
drop policy if exists "miembros_todo" on visitas; create policy "miembros_todo" on visitas for all to authenticated using (public.es_miembro('maix')) with check (public.es_miembro('maix'));
-- Finanzas y producción: solo administradores
do $$
declare t text;
begin
  for t in select unnest(array['gastos','gastos_marketing','lote_costos','lotes','maquiladores','sync_log']) loop
    execute format('drop policy if exists "miembros_todo" on maix.%I', t);
    execute format('drop policy if exists "admins_todo" on maix.%I', t);
    execute format('create policy "admins_todo" on maix.%I for all to authenticated using (public.es_admin(''maix'')) with check (public.es_admin(''maix''))', t);
  end loop;
  -- Rutas puede leer lotes (para despachar) pero no escribirlos
  execute 'drop policy if exists "miembros_leen" on maix.lotes';
  execute 'create policy "miembros_leen" on maix.lotes for select to authenticated using (public.es_miembro(''maix''))';
end $$;
grant select, insert, update, delete on rutas, visitas to authenticated;
grant select on rutas_resumen, puntos_venta_resumen to authenticated;
revoke execute on function asignar_fifo(uuid,uuid,integer), registrar_visita(jsonb), marcar_pago(uuid,text,text) from public, anon;
grant execute on function asignar_fifo(uuid,uuid,integer), registrar_visita(jsonb), marcar_pago(uuid,text,text) to authenticated;

reset search_path;
