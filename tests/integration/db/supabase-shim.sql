-- ════════════════════════════════════════════════════════════════════════════
--  Shim mínimo do ambiente Supabase para rodar migrações/testes no PGlite
--  (Postgres em WebAssembly, sem Docker). Reproduz só o que o projeto usa:
--  papéis anon/authenticated/service_role, auth.users + auth.uid(),
--  storage.buckets/objects + storage.foldername() e os grants padrão.
-- ════════════════════════════════════════════════════════════════════════════
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ), ''
  )::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[]
language plpgsql as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant execute on all functions in schema storage to anon, authenticated, service_role;

-- Grants padrão do Supabase no schema public (o RLS é quem protege os dados).
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
