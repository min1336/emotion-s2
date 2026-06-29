alter table public.push_subscriptions
  add column if not exists device_key text;

update public.push_subscriptions
  set device_key = client_id
  where device_key is null;

alter table public.push_subscriptions
  alter column device_key set not null;

create unique index if not exists push_subscriptions_code_device_key_idx
  on public.push_subscriptions (couple_code, device_key);
