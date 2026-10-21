-- Artify — шема за Supabase. Залепи го целиот фајл во SQL Editor и кликни Run.
-- Секоја табела има ист облик: id, user_id (сопственик), data (jsonb), updated_at.
-- Row Level Security: секој ред го гледа/менува САМО корисникот што го креирал.

create extension if not exists pgcrypto;

do $$
declare t text;
begin
  foreach t in array array['settings','products','additional_costs','orders','client_notes','inventory','expenses','freelance']
  loop
    execute format('create table if not exists public.%I (
      id text primary key,
      user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format('create policy "owner_all" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
  end loop;
end $$;

-- индекси за побрзо пребарување по датум/клиент (не се задолжителни)
create index if not exists orders_date_idx on public.orders ((data->>'order_date'));
create index if not exists orders_customer_idx on public.orders ((data->>'customer_name'));

-- мала табела што ја „пинга“ GitHub Action за проектот да не се паузира (анонимно читање е дозволено, таа нема податоци)
create table if not exists public.keepalive (id int primary key default 1, pinged_at timestamptz default now());
alter table public.keepalive enable row level security;
drop policy if exists "anon_read" on public.keepalive;
create policy "anon_read" on public.keepalive for select to anon, authenticated using (true);
insert into public.keepalive (id) values (1) on conflict do nothing;

-- Јавна копија САМО на логото и името на бизнисот, за екранот за најава пред да има сесија.
-- (Извршете го и ова ако шемата ја имате од порано.)
create table if not exists public.brand (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  logo text,
  name text,
  updated_at timestamptz not null default now()
);
alter table public.brand enable row level security;
drop policy if exists "brand_public_read" on public.brand;
create policy "brand_public_read" on public.brand for select to anon, authenticated using (true);
drop policy if exists "brand_owner_write" on public.brand;
create policy "brand_owner_write" on public.brand for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
