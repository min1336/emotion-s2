create table if not exists public.couple_pokes (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  sender_id text not null,
  message text not null default '콕 찔렀어요',
  created_at timestamptz not null default now()
);

create index if not exists couple_pokes_code_created_idx
on public.couple_pokes (couple_code, created_at desc);

alter table public.couple_pokes enable row level security;

drop policy if exists couple_pokes_code_select on public.couple_pokes;
drop policy if exists couple_pokes_code_insert on public.couple_pokes;
drop policy if exists couple_pokes_code_delete on public.couple_pokes;

create policy couple_pokes_code_select
on public.couple_pokes
for select
to anon, authenticated
using (couple_code = public.current_couple_code());

create policy couple_pokes_code_insert
on public.couple_pokes
for insert
to anon, authenticated
with check (couple_code = public.current_couple_code());

create policy couple_pokes_code_delete
on public.couple_pokes
for delete
to anon, authenticated
using (couple_code = public.current_couple_code());

grant select, insert, delete on public.couple_pokes to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_pokes'
  ) then
    alter publication supabase_realtime add table public.couple_pokes;
  end if;
end $$;
