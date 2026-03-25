-- ============================================================
-- IT MANAGER — Schema Supabase
-- Basado en ITIL: Incidentes, Cambios, Problemas, Solicitudes, CMDB
-- ============================================================

-- ============================================================
-- LIMPIEZA (permite re-ejecutar el schema desde cero)
-- ============================================================
drop table if exists notifications cascade;
drop table if exists service_requests cascade;
drop table if exists problems cascade;
drop table if exists changes cascade;
drop table if exists incident_comments cascade;
drop table if exists incidents cascade;
drop table if exists assets cascade;
drop table if exists categories cascade;
drop table if exists profiles cascade;

drop type if exists asset_status cascade;
drop type if exists request_status cascade;
drop type if exists problem_status cascade;
drop type if exists change_status cascade;
drop type if exists incident_status cascade;
drop type if exists priority_level cascade;
drop type if exists user_role cascade;

drop function if exists generate_ticket_number cascade;
drop function if exists set_incident_ticket cascade;
drop function if exists set_change_ticket cascade;
drop function if exists set_problem_ticket cascade;
drop function if exists set_request_ticket cascade;
drop function if exists update_updated_at cascade;
drop function if exists handle_new_user cascade;

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- PERFILES DE USUARIO (extiende auth.users)
-- ============================================================
create type user_role as enum ('admin', 'manager', 'technician', 'user');

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  role user_role not null default 'user',
  department text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Usuarios pueden ver todos los perfiles"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Usuarios pueden actualizar su propio perfil"
  on profiles for update using (auth.uid() = id);

-- ============================================================
-- PRIORIDADES Y ESTADOS (enums)
-- ============================================================
create type priority_level as enum ('critical', 'high', 'medium', 'low');
create type incident_status as enum ('open', 'in_progress', 'resolved', 'closed', 'cancelled');
create type change_status as enum ('draft', 'review', 'approved', 'scheduled', 'implementing', 'completed', 'failed', 'cancelled');
create type problem_status as enum ('open', 'investigating', 'known_error', 'resolved', 'closed');
create type request_status as enum ('submitted', 'in_progress', 'fulfilled', 'cancelled');
create type asset_status as enum ('active', 'inactive', 'maintenance', 'retired', 'disposed');

-- ============================================================
-- CATEGORÍAS
-- ============================================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('incident', 'change', 'problem', 'request')),
  description text,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
create policy "Authenticated can view categories" on categories for select using (auth.role() = 'authenticated');
create policy "Admins can manage categories" on categories for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- ============================================================
-- ACTIVOS / CMDB
-- ============================================================
create table assets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  asset_tag text unique,
  type text not null, -- server, laptop, router, switch, software, etc.
  manufacturer text,
  model text,
  serial_number text unique,
  ip_address inet,
  mac_address macaddr,
  location text,
  department text,
  assigned_to uuid references profiles(id),
  status asset_status not null default 'active',
  purchase_date date,
  warranty_expiry date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table assets enable row level security;
create policy "Authenticated can view assets" on assets for select using (auth.role() = 'authenticated');
create policy "Admins and managers can manage assets" on assets for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- ============================================================
-- INCIDENTES
-- ============================================================
create table incidents (
  id uuid primary key default uuid_generate_v4(),
  ticket_number text unique,
  title text not null,
  description text not null,
  category_id uuid references categories(id),
  priority priority_level not null default 'medium',
  status incident_status not null default 'open',
  reported_by uuid references profiles(id) not null,
  assigned_to uuid references profiles(id),
  affected_asset_id uuid references assets(id),
  resolution text,
  resolved_at timestamptz,
  closed_at timestamptz,
  sla_breach boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table incidents enable row level security;
create policy "Users can view incidents" on incidents for select using (auth.role() = 'authenticated');
create policy "Users can create incidents" on incidents for insert with check (auth.uid() = reported_by);
create policy "Technicians and above can update incidents" on incidents for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager', 'technician'))
);

-- Comentarios de incidentes
create table incident_comments (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid references incidents(id) on delete cascade not null,
  author_id uuid references profiles(id) not null,
  content text not null,
  is_internal boolean default false,
  created_at timestamptz not null default now()
);

alter table incident_comments enable row level security;
create policy "Authenticated can view public comments" on incident_comments for select using (
  auth.role() = 'authenticated' and (
    not is_internal or
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager', 'technician'))
  )
);
create policy "Authenticated can add comments" on incident_comments for insert with check (auth.uid() = author_id);

-- ============================================================
-- CAMBIOS
-- ============================================================
create table changes (
  id uuid primary key default uuid_generate_v4(),
  ticket_number text unique,
  title text not null,
  description text not null,
  justification text,
  impact_analysis text,
  rollback_plan text,
  category_id uuid references categories(id),
  priority priority_level not null default 'medium',
  status change_status not null default 'draft',
  change_type text check (change_type in ('standard', 'normal', 'emergency')),
  requested_by uuid references profiles(id) not null,
  assigned_to uuid references profiles(id),
  approved_by uuid references profiles(id),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  implemented_at timestamptz,
  affected_assets uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table changes enable row level security;
create policy "Authenticated can view changes" on changes for select using (auth.role() = 'authenticated');
create policy "Authenticated can create changes" on changes for insert with check (auth.uid() = requested_by);
create policy "Managers and above can approve/update changes" on changes for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- ============================================================
-- PROBLEMAS
-- ============================================================
create table problems (
  id uuid primary key default uuid_generate_v4(),
  ticket_number text unique,
  title text not null,
  description text not null,
  root_cause text,
  workaround text,
  resolution text,
  category_id uuid references categories(id),
  priority priority_level not null default 'medium',
  status problem_status not null default 'open',
  reported_by uuid references profiles(id) not null,
  assigned_to uuid references profiles(id),
  related_incidents uuid[],
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table problems enable row level security;
create policy "Authenticated can view problems" on problems for select using (auth.role() = 'authenticated');
create policy "Technicians and above can manage problems" on problems for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager', 'technician'))
);

-- ============================================================
-- SOLICITUDES DE SERVICIO
-- ============================================================
create table service_requests (
  id uuid primary key default uuid_generate_v4(),
  ticket_number text unique,
  title text not null,
  description text not null,
  category_id uuid references categories(id),
  priority priority_level not null default 'low',
  status request_status not null default 'submitted',
  requested_by uuid references profiles(id) not null,
  assigned_to uuid references profiles(id),
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table service_requests enable row level security;
create policy "Users can view their own requests" on service_requests for select using (
  auth.uid() = requested_by or
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager', 'technician'))
);
create policy "Users can create requests" on service_requests for insert with check (auth.uid() = requested_by);
create policy "Technicians and above can update requests" on service_requests for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager', 'technician'))
);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text check (type in ('incident', 'change', 'problem', 'request', 'system')),
  reference_id uuid,
  read boolean default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
create policy "Users can view their own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users can mark their notifications as read" on notifications for update using (auth.uid() = user_id);

-- ============================================================
-- FUNCIONES: generar ticket numbers automáticamente
-- ============================================================
create or replace function generate_ticket_number(prefix text, id uuid)
returns text as $$
begin
  return prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(id::text, 1, 6));
end;
$$ language plpgsql;

create or replace function set_incident_ticket() returns trigger as $$
begin
  if new.ticket_number is null then
    new.ticket_number := generate_ticket_number('INC', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function set_change_ticket() returns trigger as $$
begin
  if new.ticket_number is null then
    new.ticket_number := generate_ticket_number('CHG', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function set_problem_ticket() returns trigger as $$
begin
  if new.ticket_number is null then
    new.ticket_number := generate_ticket_number('PRB', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function set_request_ticket() returns trigger as $$
begin
  if new.ticket_number is null then
    new.ticket_number := generate_ticket_number('REQ', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_incident_ticket_number before insert on incidents for each row execute function set_incident_ticket();
create trigger set_change_ticket_number before insert on changes for each row execute function set_change_ticket();
create trigger set_problem_ticket_number before insert on problems for each row execute function set_problem_ticket();
create trigger set_request_ticket_number before insert on service_requests for each row execute function set_request_ticket();

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on assets for each row execute function update_updated_at();
create trigger set_updated_at before update on incidents for each row execute function update_updated_at();
create trigger set_updated_at before update on changes for each row execute function update_updated_at();
create trigger set_updated_at before update on problems for each row execute function update_updated_at();
create trigger set_updated_at before update on service_requests for each row execute function update_updated_at();

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- DATOS INICIALES: Categorías
-- ============================================================
insert into categories (name, type, description) values
  ('Hardware', 'incident', 'Fallos o problemas con equipos físicos'),
  ('Software', 'incident', 'Problemas con aplicaciones o sistemas operativos'),
  ('Red / Conectividad', 'incident', 'Problemas de red, VPN, internet'),
  ('Seguridad', 'incident', 'Incidentes de seguridad informática'),
  ('Accesos y Permisos', 'incident', 'Solicitudes de acceso o permisos'),
  ('Infraestructura', 'change', 'Cambios en servidores, red o infraestructura'),
  ('Aplicaciones', 'change', 'Actualizaciones o cambios en aplicaciones'),
  ('Seguridad', 'change', 'Cambios relacionados con seguridad'),
  ('Hardware Recurrente', 'problem', 'Problemas repetitivos de hardware'),
  ('Software Recurrente', 'problem', 'Problemas repetitivos de software'),
  ('Cuenta de Usuario', 'request', 'Crear, modificar o eliminar cuentas'),
  ('Equipamiento', 'request', 'Solicitud de equipos o periféricos'),
  ('Software / Licencias', 'request', 'Solicitud de software o licencias'),
  ('Acceso Remoto', 'request', 'Configuración de VPN o acceso remoto');
