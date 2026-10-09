-- ════════════════════════════════════════════════════════════════════════════
--  Subconjunto do pgTAP implementado em PL/pgSQL, para executar
--  supabase/tests/database.test.sql no PGlite (que não tem a extensão pgtap).
--  As asserções rodam com o papel ATUAL (respeitam RLS); só o registro do
--  resultado é SECURITY DEFINER.
-- ════════════════════════════════════════════════════════════════════════════
create schema tap;
create table tap.results (n serial primary key, ok boolean not null, description text);
create table tap.plan (planned int);

create function tap._record(_ok boolean, _description text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  insert into tap.results (ok, description) values (coalesce(_ok, false), _description);
  return case when coalesce(_ok, false) then 'ok' else 'not ok' end || ' - ' || coalesce(_description, '');
end $$;

grant usage on schema tap to public;
grant execute on function tap._record(boolean, text) to public;

create function public.plan(int) returns text language plpgsql security definer set search_path = '' as $$
begin
  insert into tap.plan values ($1);
  return '1..' || $1;
end $$;

create function public.ok(boolean, text) returns text language sql as $$ select tap._record($1, $2) $$;

create function public.is(anyelement, anyelement, text) returns text language sql as $$
  select tap._record($1 is not distinct from $2, $3 || ' (obtido: ' || coalesce($1::text, 'NULL') || ', esperado: ' || coalesce($2::text, 'NULL') || ')')
$$;

create function public.isnt(anyelement, anyelement, text) returns text language sql as $$
  select tap._record($1 is distinct from $2, $3)
$$;

create function public.has_table(name, name, text) returns text language sql as $$
  select tap._record(exists (select 1 from pg_catalog.pg_tables where schemaname = $1 and tablename = $2), $3)
$$;

create function public.lives_ok(text, text) returns text language plpgsql as $$
begin
  execute $1;
  return tap._record(true, $2);
exception when others then
  return tap._record(false, $2 || ' — erro: ' || sqlerrm);
end $$;

create function public.throws_ok(text, text, text, text) returns text language plpgsql as $$
begin
  execute $1;
  return tap._record(false, $4 || ' — não lançou erro');
exception when others then
  return tap._record(sqlstate = $2, $4 || ' (sqlstate ' || sqlstate || ': ' || sqlerrm || ')');
end $$;

create function public.is_empty(text, text) returns text language plpgsql as $$
declare _count bigint;
begin
  execute format('select count(*) from (%s) as _q', $1) into _count;
  return tap._record(_count = 0, $2 || ' (linhas: ' || _count || ')');
end $$;

create function public.finish() returns setof text language sql as $$
  select 'falhas: ' || count(*) filter (where not ok) || ' de ' || count(*) from tap.results
$$;

grant execute on all functions in schema public to public;
