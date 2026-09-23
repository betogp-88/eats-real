-- Zona o ruta para agrupar puntos de venta (útil con muchas tiendas).
-- Ejecutar después de 0004 (y de 0005 si ya existe el esquema maix).
alter table public.puntos_venta add column if not exists zona text;
create index if not exists puntos_venta_zona_idx on public.puntos_venta (zona);
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'maix' and table_name = 'puntos_venta') then
    alter table maix.puntos_venta add column if not exists zona text;
    create index if not exists puntos_venta_zona_idx on maix.puntos_venta (zona);
  end if;
end $$;

create or replace function public.crear_punto_venta(p_datos jsonb) returns uuid language plpgsql as $$
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
