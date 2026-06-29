insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-chat-media',
  'couple-chat-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.couple_messages
  add column if not exists media_storage_path text,
  add column if not exists media_mime_type text,
  add column if not exists media_size integer,
  add column if not exists media_file_name text;

alter table public.couple_messages
  alter column body drop not null;

do $$
declare
  check_name text;
begin
  for check_name in
    select conname
    from pg_constraint
    where conrelid = 'public.couple_messages'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%message_type%'
        or pg_get_constraintdef(oid) like '%char_length(btrim(body))%'
      )
  loop
    execute format('alter table public.couple_messages drop constraint if exists %I', check_name);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.couple_messages'::regclass
      and conname = 'couple_messages_type_check'
  ) then
    alter table public.couple_messages
      add constraint couple_messages_type_check
      check (message_type in ('text', 'image', 'video'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.couple_messages'::regclass
      and conname = 'couple_messages_body_check'
  ) then
    alter table public.couple_messages
      add constraint couple_messages_body_check
      check (
        (
          message_type = 'text'
          and body is not null
          and char_length(btrim(body)) between 1 and 500
          and media_storage_path is null
          and media_mime_type is null
          and media_size is null
          and media_file_name is null
        )
        or (
          message_type in ('image', 'video')
          and media_storage_path is not null
          and (body is null or char_length(btrim(body)) <= 500)
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.couple_messages'::regclass
      and conname = 'couple_messages_media_check'
  ) then
    alter table public.couple_messages
      add constraint couple_messages_media_check
      check (
        message_type = 'text'
        or (
          message_type = 'image'
          and coalesce(media_mime_type, '') like 'image/%'
          and coalesce(media_size, 0) > 0
        )
        or (
          message_type = 'video'
          and coalesce(media_mime_type, '') like 'video/%'
          and coalesce(media_size, 0) > 0
        )
      );
  end if;
end $$;

create unique index if not exists couple_messages_media_path_idx
on public.couple_messages (media_storage_path)
where media_storage_path is not null;

drop policy if exists couple_chat_media_storage_select on storage.objects;
drop policy if exists couple_chat_media_storage_insert on storage.objects;
drop policy if exists couple_chat_media_storage_delete on storage.objects;

create policy couple_chat_media_storage_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'couple-chat-media'
  and public.current_couple_access_ok(split_part(name, '/', 1))
);

create policy couple_chat_media_storage_insert
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'couple-chat-media'
  and public.current_couple_access_ok(split_part(name, '/', 1))
  and split_part(name, '/', 2) = 'messages'
  and split_part(name, '/', 3) = public.current_member_key()
);

create policy couple_chat_media_storage_delete
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'couple-chat-media'
  and public.current_couple_access_ok(split_part(name, '/', 1))
);
