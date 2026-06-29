create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  client_id text not null,
  device_key text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (couple_code, endpoint)
);

create index if not exists push_subscriptions_code_client_idx
  on public.push_subscriptions (couple_code, client_id);

create unique index if not exists push_subscriptions_code_device_key_idx
  on public.push_subscriptions (couple_code, device_key);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions are visible to the current couple" on public.push_subscriptions;
create policy "push subscriptions are visible to the current couple"
  on public.push_subscriptions
  for select
  using (couple_code = public.current_couple_code());

drop policy if exists "push subscriptions can be created by the current couple" on public.push_subscriptions;
create policy "push subscriptions can be created by the current couple"
  on public.push_subscriptions
  for insert
  with check (couple_code = public.current_couple_code());

drop policy if exists "push subscriptions can be refreshed by the current couple" on public.push_subscriptions;
create policy "push subscriptions can be refreshed by the current couple"
  on public.push_subscriptions
  for update
  using (couple_code = public.current_couple_code())
  with check (couple_code = public.current_couple_code());

drop policy if exists "push subscriptions can be removed by the current couple" on public.push_subscriptions;
create policy "push subscriptions can be removed by the current couple"
  on public.push_subscriptions
  for delete
  using (couple_code = public.current_couple_code());

grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;
