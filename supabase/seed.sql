-- Datos iniciales
insert into ubicaciones (nombre, tipo) values ('Almacén', 'almacen'), ('Merma', 'merma')
on conflict (nombre) do nothing;

insert into productos (sku, nombre, presentacion, precio_lista, color) values
  ('ER-FRESA',   'Fresa',   'Bolsa 12 g', 49, '#D54863'),
  ('ER-MANZANA', 'Manzana', 'Bolsa 12 g', 49, '#D75857'),
  ('ER-MANGO',   'Mango',   'Bolsa 12 g', 49, '#F5A623'),
  ('ER-PLATANO', 'Plátano', 'Bolsa 12 g', 49, '#E8C21A'),
  ('ER-PINA',    'Piña',    'Bolsa 12 g', 49, '#82C2BF')
on conflict (sku) do nothing;
