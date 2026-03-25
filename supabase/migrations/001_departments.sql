-- ============================================================
-- Migración 001: Tabla de Departamentos
-- ============================================================

-- Crear tabla de departamentos
create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table departments enable row level security;

-- Todos los usuarios autenticados pueden ver departamentos
create policy "departments_select" on departments
  for select to authenticated using (true);

-- Solo admins y managers pueden modificar
create policy "departments_insert" on departments
  for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
  );

create policy "departments_update" on departments
  for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
  );

-- Agregar columna department_id a incidents
alter table incidents
  add column if not exists department_id uuid references departments(id) on delete set null;

-- Agregar columna department_id a service_requests
alter table service_requests
  add column if not exists department_id uuid references departments(id) on delete set null;

-- Agregar columna department_id a profiles (para el departamento del usuario)
-- Ya existe columna "department text" — la reemplazamos con FK
-- (solo si quieres migrar, si no, se puede dejar el campo text existente)

-- Datos iniciales
insert into departments (name) values
  ('Ventas'),
  ('Gerencia'),
  ('Tráfico'),
  ('Logística'),
  ('Seguridad'),
  ('Contabilidad')
on conflict (name) do nothing;
