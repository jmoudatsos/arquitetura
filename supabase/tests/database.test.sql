-- ════════════════════════════════════════════════════════════════════════════
--  Testes do banco (pgTAP) — RLS, constraints, triggers e storage.
--
--  Com Docker:  npx supabase test db
--  Sem Docker:  npm run test:integration  (roda ESTE arquivo no PGlite, com um
--               shim do pgTAP e do esquema auth/storage — tests/integration/db)
-- ════════════════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

-- ───────────── estrutura ─────────────
select has_table('public', 'projects', 'tabela projects existe');
select has_table('public', 'services', 'tabela services existe');
select has_table('public', 'leads', 'tabela leads existe');
select has_table('public', 'media', 'tabela media existe');
select has_table('public', 'site_settings', 'tabela site_settings existe');
select has_table('public', 'notification_settings', 'tabela notification_settings existe');
select has_table('public', 'admin_users', 'tabela admin_users existe');

select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.projects'::regclass, 'public.services'::regclass, 'public.leads'::regclass,
                  'public.media'::regclass, 'public.site_settings'::regclass,
                  'public.notification_settings'::regclass, 'public.admin_users'::regclass)),
  'RLS ligado em todas as tabelas'
);

select is((select count(*)::int from storage.buckets where id in ('site-media', 'briefing-uploads')), 2, 'buckets criados');
select is((select public from storage.buckets where id = 'briefing-uploads'), false, 'bucket de anexos é privado');

-- ───────────── dados de teste (como superusuário) ─────────────
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'admin@teste.dev'),
  ('22222222-2222-4222-8222-222222222222', 'curioso@teste.dev');
insert into public.admin_users (user_id, role) values ('11111111-1111-4111-8111-111111111111', 'owner');

insert into public.projects (id, slug, title, category, status) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'teste-publicado', 'Publicado', 'cozinha', 'published'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'teste-rascunho', 'Rascunho', 'quarto', 'draft');

insert into public.leads (id, name, whatsapp, rooms, consent) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Cliente Teste', '5548999990000', array['cozinha'], true);

-- ───────────── triggers ─────────────
select isnt((select published_at from public.projects where slug = 'teste-publicado'), null, 'published_at preenchido ao publicar');
select is((select published_at from public.projects where slug = 'teste-rascunho'), null, 'rascunho sem published_at');
update public.projects set status = 'published' where slug = 'teste-rascunho';
select isnt((select published_at from public.projects where slug = 'teste-rascunho'), null, 'published_at preenchido na primeira publicação');

-- ───────────── constraints ─────────────
select throws_ok(
  $$insert into public.projects (slug, title, category) values ('Slug Inválido', 'X1', 'cozinha')$$,
  '23514', null, 'slug fora do padrão é rejeitado'
);
select throws_ok(
  $$insert into public.leads (name, whatsapp) values ('Fulano', '12ab')$$,
  '23514', null, 'WhatsApp inválido é rejeitado'
);
select throws_ok(
  $$insert into public.leads (name, whatsapp, rooms) values ('Fulano', '5548999990000', array['garagem'])$$,
  '23514', null, 'ambiente desconhecido é rejeitado'
);
select throws_ok(
  $$insert into public.site_settings (id) values (2)$$,
  '23514', null, 'site_settings só admite a linha 1'
);

-- ───────────── visitante anônimo ─────────────
set local role anon;
select set_config('request.jwt.claims', '', true);

select is((select count(*)::int from public.projects where slug like 'teste-%'), 2, 'anon vê projetos publicados');
update public.projects set status = 'draft' where slug = 'teste-rascunho';
select is((select status from public.projects where slug = 'teste-rascunho'), 'published', 'anon não altera projetos');
select is_empty($$select id from public.leads$$, 'anon não lê leads');
select throws_ok(
  $$insert into public.leads (name, whatsapp) values ('Spam', '5548999990000')$$,
  '42501', null, 'anon não insere leads direto (só via Edge Function)'
);
select is_empty($$select id from public.notification_settings$$, 'anon não lê destinos de notificação');
select is((select count(*)::int from public.site_settings), 1, 'anon lê configurações públicas');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('briefing-uploads', '0f8e7a6b-1c2d-4e3f-8a9b-0c1d2e3f4a5b/planta.pdf')$$,
  'anon envia anexo para pasta <uuid>/'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('briefing-uploads', 'qualquer/planta.pdf')$$,
  '42501', null, 'anon não envia anexo fora de pasta <uuid>/'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('site-media', 'uploads/x.webp')$$,
  '42501', null, 'anon não envia para a biblioteca do site'
);
select is_empty($$select id from storage.objects where bucket_id = 'briefing-uploads'$$, 'anon não lista anexos');

-- ───────────── usuário logado SEM permissão de admin ─────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select ok(not public.is_admin(), 'usuário comum não é admin');
select is_empty($$select id from public.leads$$, 'usuário comum não lê leads');

-- ───────────── admin ─────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select ok(public.is_admin(), 'admin reconhecido');
select is((select count(*)::int from public.leads where id = 'bbbbbbbb-0000-4000-8000-000000000001'), 1, 'admin lê leads');
select lives_ok($$update public.leads set status = 'em_contato' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$, 'admin muda status do lead');
select lives_ok(
  $$insert into public.projects (slug, title, category) values ('novo-pelo-admin', 'Novo', 'living')$$,
  'admin cria projeto'
);
select is((select count(*)::int from storage.objects where bucket_id = 'briefing-uploads'), 1, 'admin lista anexos');

reset role;
select * from finish();
rollback;
