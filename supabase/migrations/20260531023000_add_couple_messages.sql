create table if not exists public.couple_messages (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  sender_id text not null,
  sender_member_key text not null check (sender_member_key in ('jungseo', 'minhyeok')),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  message_type text not null default 'text' check (message_type in ('text')),
  source_poke_id uuid unique references public.couple_pokes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists couple_messages_code_created_idx
on public.couple_messages (couple_code, created_at desc, id desc);

alter table public.couple_messages enable row level security;

drop policy if exists couple_messages_code_select on public.couple_messages;
drop policy if exists couple_messages_code_insert on public.couple_messages;
drop policy if exists couple_messages_code_delete on public.couple_messages;

create policy couple_messages_code_select
on public.couple_messages
for select
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

create policy couple_messages_code_insert
on public.couple_messages
for insert
to anon, authenticated
with check (
  public.current_couple_access_ok(couple_code)
  and sender_member_key = public.current_member_key()
);

create policy couple_messages_code_delete
on public.couple_messages
for delete
to anon, authenticated
using (
  public.current_couple_access_ok(couple_code)
  and sender_member_key = public.current_member_key()
);

grant select, insert, delete on public.couple_messages to anon, authenticated;

insert into public.couple_messages (
  couple_code,
  sender_id,
  sender_member_key,
  body,
  created_at,
  source_poke_id
)
select
  couple_code,
  sender_id,
  sender_member_key,
  message,
  created_at,
  id
from public.couple_pokes
where sender_member_key in ('jungseo', 'minhyeok')
on conflict (source_poke_id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_messages'
  ) then
    alter publication supabase_realtime add table public.couple_messages;
  end if;
end $$;
