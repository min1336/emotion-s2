insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-photos',
  'couple-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.couple_photos (
  id uuid primary key default gen_random_uuid(),
  couple_code text not null references public.couples(code) on delete cascade,
  photo_date date not null,
  storage_path text not null unique,
  caption text,
  uploaded_by text check (uploaded_by in ('jungseo', 'minhyeok')),
  created_at timestamptz not null default now()
);

create index if not exists couple_photos_code_date_idx
on public.couple_photos (couple_code, photo_date, created_at desc);

alter table public.couple_photos enable row level security;

drop policy if exists couple_photos_code_select on public.couple_photos;
drop policy if exists couple_photos_code_insert on public.couple_photos;
drop policy if exists couple_photos_code_delete on public.couple_photos;

create policy couple_photos_code_select
on public.couple_photos
for select
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

create policy couple_photos_code_insert
on public.couple_photos
for insert
to anon, authenticated
with check (
  public.current_couple_access_ok(couple_code)
  and (uploaded_by is null or uploaded_by = public.current_member_key())
);

create policy couple_photos_code_delete
on public.couple_photos
for delete
to anon, authenticated
using (public.current_couple_access_ok(couple_code));

grant select, insert, delete on public.couple_photos to anon, authenticated;

drop policy if exists couple_photos_storage_select on storage.objects;
drop policy if exists couple_photos_storage_insert on storage.objects;
drop policy if exists couple_photos_storage_delete on storage.objects;

create policy couple_photos_storage_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'couple-photos'
  and public.current_couple_access_ok(split_part(name, '/', 1))
);

create policy couple_photos_storage_insert
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'couple-photos'
  and public.current_couple_access_ok(split_part(name, '/', 1))
);

create policy couple_photos_storage_delete
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'couple-photos'
  and public.current_couple_access_ok(split_part(name, '/', 1))
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_photos'
  ) then
    alter publication supabase_realtime add table public.couple_photos;
  end if;
end $$;
