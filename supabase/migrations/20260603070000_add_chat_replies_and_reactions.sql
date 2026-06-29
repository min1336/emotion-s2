alter table public.couple_messages
  add column if not exists reply_to_message_id uuid references public.couple_messages(id) on delete set null;

create index if not exists couple_messages_reply_to_idx
on public.couple_messages (reply_to_message_id)
where reply_to_message_id is not null;

create table if not exists public.couple_message_reactions (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  message_id uuid not null references public.couple_messages(id) on delete cascade,
  member_key text not null check (member_key in ('jungseo', 'minhyeok')),
  emoji text not null check (emoji in ('❤️', '😂', '👍', '🥺')),
  created_at timestamptz not null default now(),
  unique (message_id, member_key)
);

create index if not exists couple_message_reactions_message_idx
on public.couple_message_reactions (message_id, created_at);

alter table public.couple_message_reactions enable row level security;

drop policy if exists couple_message_reactions_select on public.couple_message_reactions;
drop policy if exists couple_message_reactions_insert on public.couple_message_reactions;
drop policy if exists couple_message_reactions_update on public.couple_message_reactions;
drop policy if exists couple_message_reactions_delete on public.couple_message_reactions;

create policy couple_message_reactions_select
on public.couple_message_reactions
for select
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

create policy couple_message_reactions_insert
on public.couple_message_reactions
for insert
to anon, authenticated
with check (
  public.current_couple_access_ok(couple_code)
  and member_key = public.current_member_key()
);

create policy couple_message_reactions_update
on public.couple_message_reactions
for update
to anon, authenticated
using (
  public.current_couple_access_ok(couple_code)
  and member_key = public.current_member_key()
)
with check (
  public.current_couple_access_ok(couple_code)
  and member_key = public.current_member_key()
);

create policy couple_message_reactions_delete
on public.couple_message_reactions
for delete
to anon, authenticated
using (
  public.current_couple_access_ok(couple_code)
  and member_key = public.current_member_key()
);

grant select, insert, update, delete on public.couple_message_reactions to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_message_reactions'
  ) then
    alter publication supabase_realtime add table public.couple_message_reactions;
  end if;
end $$;
