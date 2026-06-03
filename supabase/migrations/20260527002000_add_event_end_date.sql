alter table public.couple_events
  add column if not exists event_end_date date;

update public.couple_events
set event_end_date = null
where event_end_date = event_date;

alter table public.couple_events
  drop constraint if exists couple_events_date_range_check;

alter table public.couple_events
  add constraint couple_events_date_range_check
  check (event_end_date is null or event_end_date >= event_date);

create index if not exists couple_events_code_range_idx
on public.couple_events (couple_code, event_date, event_end_date);
