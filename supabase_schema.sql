-- ============================================================
--  ASESOR FINANCIERO · Esquema de base de datos para Supabase
--  Copia TODO este archivo y pégalo en:
--  Supabase  ->  tu proyecto  ->  SQL Editor  ->  New query  ->  Run
-- ============================================================

-- 1) TABLA DE PERFILES (datos generales del usuario)
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ingreso numeric default 0,
  pago_extra numeric default 0,
  estrategia text default 'avalanche',
  meta_nombre text default 'Fondo de emergencia',
  meta_objetivo numeric default 0,
  meta_ahorrado numeric default 0,
  creado_en timestamptz default now()
);

-- 2) TABLA DE DEUDAS
create table if not exists public.deudas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  saldo numeric default 0,
  tasa numeric default 0,
  minimo numeric default 0,
  creado_en timestamptz default now()
);

-- 3) TABLA DE GASTOS
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  monto numeric default 0,
  categoria text default 'Otro',
  creado_en timestamptz default now()
);

-- ============================================================
--  SEGURIDAD: Row Level Security (RLS)
--  Esto garantiza que CADA usuario solo vea y modifique SUS datos.
--  Sin esto, cualquiera podría leer los datos de otros.
-- ============================================================

alter table public.perfiles enable row level security;
alter table public.deudas   enable row level security;
alter table public.gastos   enable row level security;

-- --- Políticas para PERFILES ---
create policy "perfiles_select_propio" on public.perfiles
  for select using (auth.uid() = id);
create policy "perfiles_insert_propio" on public.perfiles
  for insert with check (auth.uid() = id);
create policy "perfiles_update_propio" on public.perfiles
  for update using (auth.uid() = id);

-- --- Políticas para DEUDAS ---
create policy "deudas_select_propio" on public.deudas
  for select using (auth.uid() = user_id);
create policy "deudas_insert_propio" on public.deudas
  for insert with check (auth.uid() = user_id);
create policy "deudas_update_propio" on public.deudas
  for update using (auth.uid() = user_id);
create policy "deudas_delete_propio" on public.deudas
  for delete using (auth.uid() = user_id);

-- --- Políticas para GASTOS ---
create policy "gastos_select_propio" on public.gastos
  for select using (auth.uid() = user_id);
create policy "gastos_insert_propio" on public.gastos
  for insert with check (auth.uid() = user_id);
create policy "gastos_update_propio" on public.gastos
  for update using (auth.uid() = user_id);
create policy "gastos_delete_propio" on public.gastos
  for delete using (auth.uid() = user_id);

-- ============================================================
--  Crear automáticamente un perfil al registrarse un usuario
-- ============================================================
create or replace function public.crear_perfil_nuevo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo();
