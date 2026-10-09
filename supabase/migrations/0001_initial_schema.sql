-- ════════════════════════════════════════════════════════════════════════════
--  0001 — Esquema inicial: site institucional + briefing + painel admin
--
--  Segurança (RLS) em resumo:
--    • Visitante (anon): lê projetos PUBLICADOS, serviços ATIVOS, mídia e
--      configurações públicas. NÃO lê nem grava leads diretamente — o envio
--      do briefing passa pela Edge Function `create-lead` (service role).
--    • Anexos do briefing: anon só pode INSERIR no bucket privado, dentro de
--      uma pasta com UUID; ninguém lista/baixa sem ser admin.
--    • Admin: usuário do Supabase Auth presente em `admin_users`.
-- ════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────── utilitários ─────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ───────────────────────────── admins ─────────────────────────────

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);
comment on table public.admin_users is 'Usuários do Supabase Auth com acesso ao painel. Inclua manualmente (ver README).';

alter table public.admin_users enable row level security;

-- SECURITY DEFINER: consulta admin_users sem esbarrar no próprio RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create policy "admin_users: o próprio usuário ou admin lê"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- Sem políticas de escrita: só via SQL Editor / service role.

-- ───────────────────────────── configurações do site ─────────────────────────────

create table public.site_settings (
  id              smallint primary key default 1 check (id = 1),
  studio_name     text not null default 'W Studio' check (char_length(studio_name) between 2 and 80),
  tagline         text check (char_length(tagline) <= 160),
  hero_title      text check (char_length(hero_title) <= 140),
  hero_subtitle   text check (char_length(hero_subtitle) <= 80),
  hero_image      text check (char_length(hero_image) <= 500),
  hero_image_alt  text check (char_length(hero_image_alt) <= 200),
  about_title     text check (char_length(about_title) <= 160),
  about_body      text check (char_length(about_body) <= 3000),
  contact_email   text check (char_length(contact_email) <= 160),
  contact_whatsapp text check (contact_whatsapp is null or contact_whatsapp ~ '^[0-9]{10,15}$'),
  contact_phone   text check (char_length(contact_phone) <= 30),
  address         text check (char_length(address) <= 200),
  city            text check (char_length(city) <= 80),
  service_area    text check (char_length(service_area) <= 300),
  opening_hours   text check (char_length(opening_hours) <= 160),
  instagram_url   text check (instagram_url is null or instagram_url ~* '^https://'),
  seo_title       text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 200),
  updated_at      timestamptz not null default now()
);
comment on table public.site_settings is 'Linha única (id = 1) com textos e contatos públicos do site.';

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings: leitura pública"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings: admin atualiza"
  on public.site_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ───────────────────────────── notificações (privado) ─────────────────────────────

create table public.notification_settings (
  id                 smallint primary key default 1 check (id = 1),
  email_enabled      boolean not null default true,
  email_recipients   text[] not null default '{}' check (cardinality(email_recipients) <= 5),
  whatsapp_enabled   boolean not null default true,
  whatsapp_recipient text check (whatsapp_recipient is null or whatsapp_recipient ~ '^[0-9]{10,15}$'),
  updated_at         timestamptz not null default now()
);
comment on table public.notification_settings is 'Destinos das notificações de novos briefings (somente admin). Vazio = variáveis das Edge Functions.';

create trigger notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

alter table public.notification_settings enable row level security;

create policy "notification_settings: somente admin"
  on public.notification_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.notification_settings (id) values (1) on conflict (id) do nothing;

-- ───────────────────────────── mídia ─────────────────────────────

create table public.media (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null default 'site-media',
  path       text check (char_length(path) <= 300),
  url        text,
  alt        text not null default '' check (char_length(alt) <= 200),
  mime_type  text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  width      integer check (width is null or width > 0),
  height     integer check (height is null or height > 0),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_has_source check (path is not null or url is not null)
);
comment on table public.media is 'Biblioteca de imagens: arquivo no Storage (path) ou URL/arquivo local (url).';

create index media_created_at_idx on public.media (created_at desc);

alter table public.media enable row level security;

create policy "media: leitura pública"
  on public.media for select
  to anon, authenticated
  using (true);

create policy "media: admin insere"
  on public.media for insert
  to authenticated
  with check (public.is_admin());

create policy "media: admin atualiza"
  on public.media for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "media: admin exclui"
  on public.media for delete
  to authenticated
  using (public.is_admin());

-- ───────────────────────────── projetos ─────────────────────────────

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title           text not null check (char_length(title) between 2 and 140),
  subtitle        text check (char_length(subtitle) <= 140),
  summary         text check (char_length(summary) <= 400),
  description     text check (char_length(description) <= 8000),
  category        text not null check (category in ('cozinha', 'quarto', 'living', 'office', 'banheiro', 'gourmet', 'comercial', 'outro')),
  style           text check (style is null or style in ('minimalista', 'contemporaneo', 'organico', 'industrial_chic')),
  location        text check (char_length(location) <= 120),
  year            smallint check (year between 1950 and 2100),
  area_m2         numeric(8, 2) check (area_m2 > 0),
  materials       text[] not null default '{}' check (cardinality(materials) <= 20),
  cover_image     text check (char_length(cover_image) <= 500),
  cover_alt       text check (char_length(cover_alt) <= 200),
  gallery         jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 30),
  status          text not null default 'draft' check (status in ('draft', 'published')),
  featured        boolean not null default false,
  sort_order      integer not null default 0,
  published_at    timestamptz,
  seo_title       text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 200),
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on column public.projects.gallery is 'Lista de { src, alt, caption } — src = caminho no bucket site-media ou URL.';
comment on column public.projects.is_sample is 'Conteúdo de exemplo do modelo; o painel avisa enquanto houver exemplos publicados.';

create index projects_public_idx on public.projects (status, sort_order, published_at desc);
create index projects_category_idx on public.projects (category) where status = 'published';

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Preenche published_at na primeira publicação.
create or replace function public.projects_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'
     and new.published_at is null
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger projects_published_at
  before insert or update on public.projects
  for each row execute function public.projects_set_published_at();

alter table public.projects enable row level security;

create policy "projects: público lê publicados; admin lê tudo"
  on public.projects for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

create policy "projects: admin insere"
  on public.projects for insert
  to authenticated
  with check (public.is_admin());

create policy "projects: admin atualiza"
  on public.projects for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "projects: admin exclui"
  on public.projects for delete
  to authenticated
  using (public.is_admin());

-- ───────────────────────────── serviços ─────────────────────────────

create table public.services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title       text not null check (char_length(title) between 2 and 100),
  summary     text check (char_length(summary) <= 300),
  description text check (char_length(description) <= 2000),
  icon        text not null default 'hammer',
  features    text[] not null default '{}' check (cardinality(features) <= 12),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index services_public_idx on public.services (is_active, sort_order);

create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

create policy "services: público lê ativos; admin lê tudo"
  on public.services for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "services: admin insere"
  on public.services for insert
  to authenticated
  with check (public.is_admin());

create policy "services: admin atualiza"
  on public.services for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "services: admin exclui"
  on public.services for delete
  to authenticated
  using (public.is_admin());

-- ───────────────────────────── leads (briefings) ─────────────────────────────

create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  status          text not null default 'novo'
                  check (status in ('novo', 'em_contato', 'proposta', 'fechado', 'perdido')),
  source          text not null default 'briefing' check (char_length(source) <= 40),

  -- etapa 1
  name            text not null check (char_length(name) between 2 and 120),
  whatsapp        text not null check (whatsapp ~ '^[0-9]{10,15}$'),
  email           text check (email is null or (char_length(email) <= 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$')),
  city            text check (char_length(city) <= 120),
  property_type   text,
  property_status text,
  start_forecast  text,
  budget_range    text,

  -- etapas 2 e 3
  rooms           text[] not null default '{}'
                  check (rooms <@ array['cozinha', 'quarto', 'living', 'office', 'banheiro', 'gourmet']::text[]),
  room_details    jsonb not null default '{}'::jsonb check (jsonb_typeof(room_details) = 'object'),

  -- etapa 4
  style           text,
  materials       text[] not null default '{}',
  reference_links text[] not null default '{}' check (cardinality(reference_links) <= 5),
  attachments     jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 8),

  -- etapa 5
  notes           text check (char_length(notes) <= 4000),
  consent         boolean not null default false,
  consent_at      timestamptz,

  -- metadados
  utm             jsonb not null default '{}'::jsonb check (jsonb_typeof(utm) = 'object'),
  user_agent      text check (char_length(user_agent) <= 300),
  ip_hash         text,
  notification    jsonb not null default '{}'::jsonb,
  notified_at     timestamptz,
  internal_notes  text check (char_length(internal_notes) <= 4000)
);
comment on table public.leads is 'Briefings recebidos pelo site. Inserção apenas pela Edge Function create-lead (service role).';
comment on column public.leads.ip_hash is 'SHA-256 do IP + sal — usado só para limitar envios repetidos (anti-spam).';

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_ip_hash_idx on public.leads (ip_hash, created_at desc);

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

create policy "leads: admin lê"
  on public.leads for select
  to authenticated
  using (public.is_admin());

create policy "leads: admin atualiza"
  on public.leads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "leads: admin exclui"
  on public.leads for delete
  to authenticated
  using (public.is_admin());
-- Sem política de INSERT: anon/authenticated não gravam leads diretamente.

-- ───────────────────────────── Storage ─────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-media', 'site-media', true, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('briefing-uploads', 'briefing-uploads', false, 26214400,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- site-media: público lê (bucket público), admin gerencia.
create policy "site-media: leitura pública"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-media');

create policy "site-media: admin envia"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-media' and public.is_admin());

create policy "site-media: admin atualiza"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin());

create policy "site-media: admin exclui"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin());

-- briefing-uploads: qualquer visitante ENVIA para "<uuid>/<arquivo>"; só admin lê/apaga.
create policy "briefing-uploads: visitante envia"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'briefing-uploads'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and array_length(storage.foldername(name), 1) = 1
  );

create policy "briefing-uploads: admin lê"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'briefing-uploads' and public.is_admin());

create policy "briefing-uploads: admin exclui"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'briefing-uploads' and public.is_admin());
