create or replace function public.current_couple_code()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true)::json->>'x-couple-code', '')
$$;

create table if not exists public.couples (
  code text primary key,
  display_name text not null default '정서 S2 민혁',
  created_at timestamptz not null default now()
);

alter table public.couples enable row level security;

drop policy if exists couples_code_select on public.couples;
drop policy if exists couples_code_insert on public.couples;

create policy couples_code_select
on public.couples
for select
to anon, authenticated
using (code = public.current_couple_code());

create policy couples_code_insert
on public.couples
for insert
to anon, authenticated
with check (
  code = public.current_couple_code()
  and char_length(code) between 3 and 32
);

grant select, insert on public.couples to anon, authenticated;

create table if not exists public.couple_events (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  event_date date not null,
  event_time time,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists couple_events_code_date_idx
on public.couple_events (couple_code, event_date, event_time, created_at desc);

alter table public.couple_events enable row level security;

drop policy if exists couple_events_code_select on public.couple_events;
drop policy if exists couple_events_code_insert on public.couple_events;
drop policy if exists couple_events_code_delete on public.couple_events;

create policy couple_events_code_select
on public.couple_events
for select
to anon, authenticated
using (couple_code = public.current_couple_code());

create policy couple_events_code_insert
on public.couple_events
for insert
to anon, authenticated
with check (couple_code = public.current_couple_code());

create policy couple_events_code_delete
on public.couple_events
for delete
to anon, authenticated
using (couple_code = public.current_couple_code());

grant select, insert, delete on public.couple_events to anon, authenticated;

create table if not exists public.couple_todos (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists couple_todos_code_completed_idx
on public.couple_todos (couple_code, completed, created_at desc);

alter table public.couple_todos enable row level security;

drop policy if exists couple_todos_code_select on public.couple_todos;
drop policy if exists couple_todos_code_insert on public.couple_todos;
drop policy if exists couple_todos_code_update on public.couple_todos;
drop policy if exists couple_todos_code_delete on public.couple_todos;

create policy couple_todos_code_select
on public.couple_todos
for select
to anon, authenticated
using (couple_code = public.current_couple_code());

create policy couple_todos_code_insert
on public.couple_todos
for insert
to anon, authenticated
with check (couple_code = public.current_couple_code());

create policy couple_todos_code_update
on public.couple_todos
for update
to anon, authenticated
using (couple_code = public.current_couple_code())
with check (couple_code = public.current_couple_code());

create policy couple_todos_code_delete
on public.couple_todos
for delete
to anon, authenticated
using (couple_code = public.current_couple_code());

grant select, insert, update, delete on public.couple_todos to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_events'
  ) then
    alter publication supabase_realtime add table public.couple_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_todos'
  ) then
    alter publication supabase_realtime add table public.couple_todos;
  end if;
end $$;
