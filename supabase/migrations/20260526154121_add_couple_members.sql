alter table public.couples
  add column if not exists invite_secret text;

update public.couples
set invite_secret = case
  when code = 'S2-0526' then 'jungseo-minhyeok'
  else replace(gen_random_uuid()::text, '-', '')
end
where invite_secret is null;

alter table public.couples
  alter column invite_secret set not null,
  alter column invite_secret set default replace(gen_random_uuid()::text, '-', '');

create or replace function public.current_couple_secret()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true)::json->>'x-couple-secret', '')
$$;

create or replace function public.current_member_key()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true)::json->>'x-member-key', '')
$$;

create or replace function public.current_couple_access_ok(target_code text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.couples
    where code = target_code
      and code = public.current_couple_code()
      and invite_secret = public.current_couple_secret()
  )
$$;

create table if not exists public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  member_key text not null check (member_key in ('jungseo', 'minhyeok')),
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (couple_code, member_key)
);

insert into public.couple_members (couple_code, member_key, display_name)
select code, 'jungseo', '정서'
from public.couples
on conflict (couple_code, member_key) do update
set display_name = excluded.display_name;

insert into public.couple_members (couple_code, member_key, display_name)
select code, 'minhyeok', '민혁'
from public.couples
on conflict (couple_code, member_key) do update
set display_name = excluded.display_name;

alter table public.couple_members enable row level security;

drop policy if exists couple_members_code_select on public.couple_members;
drop policy if exists couple_members_code_insert on public.couple_members;

create policy couple_members_code_select
on public.couple_members
for select
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

create policy couple_members_code_insert
on public.couple_members
for insert
to anon, authenticated
with check (public.current_couple_access_ok(couple_code));

grant select, insert on public.couple_members to anon, authenticated;

alter table public.couple_pokes
  add column if not exists sender_member_key text check (sender_member_key in ('jungseo', 'minhyeok'));

alter table public.push_subscriptions
  add column if not exists member_key text check (member_key in ('jungseo', 'minhyeok'));

drop policy if exists couples_code_select on public.couples;
drop policy if exists couples_code_insert on public.couples;

create policy couples_code_select
on public.couples
for select
to anon, authenticated
using (
  code = public.current_couple_code()
  and invite_secret = public.current_couple_secret()
);

create policy couples_code_insert
on public.couples
for insert
to anon, authenticated
with check (
  code = public.current_couple_code()
  and invite_secret = public.current_couple_secret()
  and char_length(code) between 3 and 32
  and char_length(invite_secret) between 8 and 128
);

drop policy if exists couple_events_code_select on public.couple_events;
drop policy if exists couple_events_code_insert on public.couple_events;
drop policy if exists couple_events_code_delete on public.couple_events;

create policy couple_events_code_select
on public.couple_events
for select
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

create policy couple_events_code_insert
on public.couple_events
for insert
to anon, authenticated
with check (public.current_couple_access_ok(couple_code));

create policy couple_events_code_delete
on public.couple_events
for delete
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

drop policy if exists couple_todos_code_select on public.couple_todos;
drop policy if exists couple_todos_code_insert on public.couple_todos;
drop policy if exists couple_todos_code_update on public.couple_todos;
drop policy if exists couple_todos_code_delete on public.couple_todos;

create policy couple_todos_code_select
on public.couple_todos
for select
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

create policy couple_todos_code_insert
on public.couple_todos
for insert
to anon, authenticated
with check (public.current_couple_access_ok(couple_code));

create policy couple_todos_code_update
on public.couple_todos
for update
to anon, authenticated
using (public.current_couple_access_ok(couple_code))
with check (public.current_couple_access_ok(couple_code));

create policy couple_todos_code_delete
on public.couple_todos
for delete
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

drop policy if exists couple_pokes_code_select on public.couple_pokes;
drop policy if exists couple_pokes_code_insert on public.couple_pokes;
drop policy if exists couple_pokes_code_delete on public.couple_pokes;

create policy couple_pokes_code_select
on public.couple_pokes
for select
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

create policy couple_pokes_code_insert
on public.couple_pokes
for insert
to anon, authenticated
with check (
  public.current_couple_access_ok(couple_code)
  and (sender_member_key is null or sender_member_key = public.current_member_key())
);

create policy couple_pokes_code_delete
on public.couple_pokes
for delete
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

drop policy if exists "push subscriptions are visible to the current couple" on public.push_subscriptions;
drop policy if exists "push subscriptions can be created by the current couple" on public.push_subscriptions;
drop policy if exists "push subscriptions can be refreshed by the current couple" on public.push_subscriptions;
drop policy if exists "push subscriptions can be removed by the current couple" on public.push_subscriptions;

create policy "push subscriptions are visible to the current couple"
  on public.push_subscriptions
  for select
  using (public.current_couple_access_ok(couple_code));

create policy "push subscriptions can be created by the current couple"
  on public.push_subscriptions
  for insert
  with check (
    public.current_couple_access_ok(couple_code)
    and (member_key is null or member_key = public.current_member_key())
  );

create policy "push subscriptions can be refreshed by the current couple"
  on public.push_subscriptions
  for update
  using (public.current_couple_access_ok(couple_code))
  with check (
    public.current_couple_access_ok(couple_code)
    and (member_key is null or member_key = public.current_member_key())
  );

create policy "push subscriptions can be removed by the current couple"
  on public.push_subscriptions
  for delete
  using (public.current_couple_access_ok(couple_code));
