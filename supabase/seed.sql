-- ════════════════════════════════════════════════════════════════════════════
--  ARQUIVO GERADO por scripts/generate-seed.mjs a partir de app/lib/demo-data.js
--  Conteúdo de EXEMPLO (projetos com is_sample = true e fotos ilustrativas).
--  Sem Docker: cole este arquivo no SQL Editor do Supabase e execute.
-- ════════════════════════════════════════════════════════════════════════════

-- Configurações públicas (placeholders — edite em Admin › Configurações)
update public.site_settings set
  studio_name = 'W Studio',
  tagline = 'Marcenaria sob medida & arquitetura de interiores',
  hero_title = 'Marcenaria sob medida & arquitetura de interiores',
  hero_subtitle = 'Na região serrana',
  hero_image = '/images/projects/cozinha-nogueira-cover.webp',
  hero_image_alt = 'Cozinha em nogueira com cristaleira iluminada e ilha em pedra escura',
  about_title = 'Desenhamos móveis que organizam a rotina e duram décadas',
  about_body = 'Somos um estúdio de arquitetura de interiores com marcenaria própria. Cada projeto nasce de uma conversa sobre como você vive — e é detalhado até a última dobradiça antes de ir para a produção.

Trabalhamos com lâminas naturais, MDF de alta densidade, lacas foscas e ferragens de linha profissional, com montagem feita pela nossa própria equipe.',
  contact_email = 'contato@seudominio.com.br',
  contact_whatsapp = '5548999999999',
  contact_phone = null,
  address = 'Endereço do estúdio (edite em Admin › Configurações)',
  city = 'Região serrana',
  service_area = 'Atendemos a região serrana e o litoral — consulte disponibilidade para outras cidades.',
  opening_hours = 'Seg. a sex., 8h às 18h · Sáb. com agendamento',
  instagram_url = null,
  seo_title = 'W Studio — Marcenaria sob medida & arquitetura de interiores',
  seo_description = 'Cozinhas, closets, livings e home offices planejados com marcenaria própria. Conte sobre o seu espaço no briefing interativo e receba uma proposta.'
where id = 1;

-- Serviços
insert into public.services (id, slug, title, summary, description, icon, features, sort_order, is_active)
values
  ('5e3d0000-0000-4000-8000-000000000201', 'marcenaria-sob-medida', 'Marcenaria sob medida', 'Móveis desenhados para o seu espaço, produzidos em marcenaria própria e montados pela nossa equipe.', 'Do detalhamento executivo à montagem: cada módulo é desenhado para as medidas reais do ambiente, com atenção a ferragens, iluminação embutida e acabamentos de borda.', 'ruler', array['Detalhamento executivo módulo a módulo', 'Lâminas naturais, MDF e lacas foscas', 'Ferragens com amortecimento', 'Montagem e ajuste final no local']::text[], 1, true),
  ('5e3d0000-0000-4000-8000-000000000202', 'arquitetura-de-interiores', 'Arquitetura de interiores', 'Layout, iluminação, revestimentos e mobiliário pensados em conjunto para o ambiente inteiro.', 'Integramos a marcenaria ao projeto de interiores completo: estudo de layout, pontos elétricos e hidráulicos, iluminação e especificação de materiais.', 'compass', array['Estudo de layout e fluxos', 'Projeto luminotécnico', 'Especificação de revestimentos', 'Compatibilização com a obra']::text[], 2, true),
  ('5e3d0000-0000-4000-8000-000000000203', 'cozinhas-planejadas', 'Cozinhas planejadas', 'Ergonomia de trabalho, eletros de embutir e armazenamento inteligente em cada gaveta.', 'Projetamos a cozinha a partir da sua rotina: triângulo de trabalho, torre quente, gavetões de alta carga, despensas e a integração com a área social.', 'utensils', array['Compatibilização de eletros', 'Torres quentes e despenseiros', 'Gavetões com divisores', 'Iluminação sob armários']::text[], 3, true),
  ('5e3d0000-0000-4000-8000-000000000204', 'closets-e-dormitorios', 'Closets & dormitórios', 'Guarda-roupas, closets e cabeceiras com divisões feitas para o que você realmente guarda.', 'Mapeamos o volume de roupas, calçados e acessórios para dimensionar cabideiros, gavetas e sapateiras — com iluminação por sensor e acabamentos internos.', 'shirt', array['Divisões internas personalizadas', 'Portas de correr, de abrir ou closet aberto', 'Iluminação acionada por sensor', 'Cabeceiras e painéis integrados']::text[], 4, true),
  ('5e3d0000-0000-4000-8000-000000000205', 'projeto-3d', 'Projeto 3D & proposta', 'Você visualiza o ambiente antes de produzir, com materiais e orçamento detalhados.', 'Apresentamos o projeto em 3D com os acabamentos escolhidos, ajustamos o que for preciso e entregamos uma proposta clara, item a item.', 'layers', array['Imagens 3D com materiais reais', 'Rodada de ajustes', 'Orçamento detalhado por ambiente', 'Cronograma de produção']::text[], 5, true),
  ('5e3d0000-0000-4000-8000-000000000206', 'acompanhamento-e-montagem', 'Acompanhamento & montagem', 'Medição técnica, acompanhamento da obra e montagem limpa até a entrega.', 'Fazemos a medição final no local, alinhamos com os demais fornecedores da obra e montamos com equipe própria, deixando o ambiente pronto para uso.', 'hammer', array['Medição técnica no local', 'Alinhamento com a obra', 'Montagem com equipe própria', 'Vistoria de entrega']::text[], 6, true)
on conflict (slug) do nothing;

-- Projetos de exemplo
insert into public.projects (id, slug, title, subtitle, summary, description, category, style, location, year, area_m2, materials, cover_image, cover_alt, gallery, status, featured, sort_order, published_at, seo_title, seo_description, is_sample)
values
  ('5e3d0000-0000-4000-8000-000000000101', 'cozinha-nogueira-e-pedra', 'Cozinha Nogueira & Pedra', 'Cozinha integrada · contemporâneo', 'Cozinha integrada com marcenaria em nogueira, cristaleira iluminada em vidro e ilha com frente ripada em preto.', 'O ponto de partida foi uma cozinha aberta para a sala de jantar, que precisava parecer mobiliário — não uma parede de armários. A torre em nogueira concentra eletros, despensa e uma cristaleira com iluminação interna em 2700K.

A ilha recebeu frente ripada em laca preta fosca e bancada em madeira maciça, funcionando como apoio para refeições rápidas. Puxadores do tipo cava usinada mantêm as fachadas contínuas.

Todos os gavetões inferiores têm corrediças de extração total com amortecimento e divisores internos para panelas e utensílios.', 'cozinha', 'contemporaneo', 'Região serrana', 2026, 18, array['Lâmina natural de nogueira', 'Laca preta fosca', 'Vidro canelado', 'Bancada em madeira maciça', 'LED linear 2700K']::text[], '/images/projects/cozinha-nogueira-cover.webp', 'Cozinha com torre em nogueira, cristaleira iluminada e ilha ripada preta', '[{"src":"/images/projects/cozinha-nogueira-2.webp","alt":"Cozinha com ilha em pedra e armários escuros","caption":"Bancada em pedra com cascata lateral"},{"src":"/images/projects/cozinha-nogueira-3.webp","alt":"Aparador em nogueira em ambiente claro","caption":"Aparador complementar na sala de jantar"}]'::jsonb, 'published', true, 1, '2026-08-20T12:00:00.000Z'::timestamptz, null, null, true),
  ('5e3d0000-0000-4000-8000-000000000102', 'living-painel-ripado', 'Living com Painel Ripado', 'Sala de estar · home theater', 'Painel em madeira do piso ao teto que esconde cabos, equipamentos e uma porta de acesso.', 'A parede da TV ganhou um painel em lâmina de madeira com ripas verticais que disfarçam uma porta de serviço e todo o cabeamento do home theater.

Na base, um rack suspenso com portas basculantes guarda os equipamentos com ventilação lateral. A iluminação indireta no topo do painel destaca a textura da madeira à noite.', 'living', 'contemporaneo', 'Região serrana', 2025, 32, array['Lâmina natural de freijó', 'Laca off-white', 'Perfil de LED embutido', 'Ferragens basculantes']::text[], '/images/projects/living-ripado-cover.webp', 'Sala de estar com painel de madeira na parede e sofá claro', '[{"src":"/images/projects/living-ripado-2.webp","alt":"Living com painel de madeira, TV e lareira","caption":"Painel integrado à lareira"},{"src":"/images/projects/living-ripado-3.webp","alt":"Nichos suspensos em madeira na parede","caption":"Nichos suspensos para objetos"}]'::jsonb, 'published', true, 2, '2026-07-14T12:00:00.000Z'::timestamptz, null, null, true),
  ('5e3d0000-0000-4000-8000-000000000103', 'suite-marcenaria-integrada', 'Suíte com Marcenaria Integrada', 'Dormitório · closet', 'Cabeceira, mesas suspensas e guarda-roupa desenhados como uma única peça.', 'A suíte foi pensada como um volume contínuo: a cabeceira estofada se prolonga em mesas de cabeceira suspensas e encontra o guarda-roupa sem interrupções visuais.

O closet tem lados independentes para o casal, sapateira deslizante e gaveta aveludada para acessórios. A iluminação interna é acionada por sensor na abertura das portas.', 'quarto', 'contemporaneo', 'Região serrana', 2025, 24, array['MDF grafite fosco', 'Lâmina de carvalho', 'Tecido em linho', 'LED com sensor de abertura']::text[], '/images/projects/suite-integrada-cover.webp', 'Suíte com parede escura, cama de casal e mesas de cabeceira', '[{"src":"/images/projects/suite-integrada-2.webp","alt":"Quarto com cabeceira em painel iluminado","caption":"Painel da cabeceira com iluminação linear"},{"src":"/images/projects/suite-integrada-3.webp","alt":"Porta de guarda-roupa em madeira","caption":"Portas em lâmina natural"}]'::jsonb, 'published', true, 3, '2026-06-02T12:00:00.000Z'::timestamptz, null, null, true),
  ('5e3d0000-0000-4000-8000-000000000104', 'banheiro-carvalho-suspenso', 'Banheiro em Carvalho Suspenso', 'Banheiro da suíte', 'Gabinete suspenso em carvalho hidrorrepelente com cuba de apoio e espelheira iluminada.', 'O gabinete suspenso libera o piso e facilita a limpeza. Produzido em MDF ultra-resistente à umidade com lâmina de carvalho e acabamento em verniz PU fosco.

A espelheira com iluminação perimetral esconde um armário raso para cosméticos, e o nicho no box segue a mesma modulação do revestimento.', 'banheiro', 'minimalista', 'Litoral', 2025, 7, array['Lâmina de carvalho com PU fosco', 'MDF RU (resistente à umidade)', 'Espelho com LED perimetral']::text[], '/images/projects/banheiro-carvalho-cover.webp', 'Banheiro com gabinete suspenso em madeira e piso escuro', '[{"src":"/images/projects/banheiro-carvalho-2.webp","alt":"Banheiro em tons de cinza com banheira","caption":"Área de banho"},{"src":"/images/projects/banheiro-carvalho-3.webp","alt":"Gabinete suspenso em madeira clara","caption":"Gabinete com gaveta organizadora"}]'::jsonb, 'published', false, 4, '2026-05-10T12:00:00.000Z'::timestamptz, null, null, true),
  ('5e3d0000-0000-4000-8000-000000000105', 'home-office-nogueira', 'Home Office em Nogueira', 'Escritório em casa', 'Bancada ergonômica, passa-fios oculto e estante para livros em um canto de 6 m².', 'Para quem passa o dia em chamadas de vídeo, a bancada foi dimensionada na altura ergonômica e o fundo recebeu estante com iluminação suave.

Toda a fiação corre por uma calha elétrica embutida sob o tampo, com tomadas e USB acessíveis sem cabos aparentes.', 'office', 'organico', 'Região serrana', 2024, 6, array['Lâmina natural de nogueira', 'Calha elétrica embutida', 'Gaveteiro com chave']::text[], '/images/projects/home-office-cover.webp', 'Bancada de trabalho em madeira com notebook à meia-luz', '[{"src":"/images/projects/home-office-2.webp","alt":"Mesa de madeira com notebook","caption":"Tampo em madeira com passa-fios"},{"src":"/images/projects/home-office-3.webp","alt":"Estante em madeira com nichos","caption":"Estante modulada"}]'::jsonb, 'published', true, 5, '2026-04-18T12:00:00.000Z'::timestamptz, null, null, true),
  ('5e3d0000-0000-4000-8000-000000000106', 'espaco-gourmet-integrado', 'Espaço Gourmet Integrado', 'Varanda · área de convivência', 'Mesa em madeira, bar com prateleiras e marcenaria resistente aberta para o jardim.', 'Um espaço de convivência aberto para o jardim, com marcenaria especificada para variações de umidade: MDF resistente à umidade, bordas seladas e ferragens em inox.

O bar integrado tem prateleiras iluminadas e uma adega, e a mesa em madeira maciça acomoda encontros grandes de fim de semana.', 'gourmet', 'organico', 'Região serrana', 2024, 28, array['Madeira maciça', 'MDF RU', 'Ferragens em inox', 'Prateleiras com LED']::text[], '/images/projects/gourmet-cover.webp', 'Sala de jantar com mesa de madeira aberta para o jardim', '[{"src":"/images/projects/gourmet-2.webp","alt":"Living e jantar integrados com painel de madeira","caption":"Integração com o living"},{"src":"/images/projects/gourmet-3.webp","alt":"Mesa de jantar escura com divisória ripada","caption":"Divisória ripada"}]'::jsonb, 'published', false, 6, '2026-03-08T12:00:00.000Z'::timestamptz, null, null, true),
  ('5e3d0000-0000-4000-8000-000000000107', 'cozinha-japandi', 'Cozinha Japandi', 'Cozinha · minimalismo quente', 'Torre em madeira clara, ilha branca e iluminação difusa para uma cozinha serena.', 'Madeira clara, superfícies brancas e nenhum puxador aparente: as portas abrem por cavas ocultas e toques.

A torre concentra forno, micro-ondas e despensa, deixando a ilha livre para preparo e refeições.', 'cozinha', 'minimalista', 'Litoral', 2024, 15, array['Lâmina de freijó claro', 'Laca branca acetinada', 'Cava usinada']::text[], '/images/projects/cozinha-japandi-cover.webp', 'Cozinha clara com ilha branca e banquetas de madeira', '[{"src":"/images/projects/cozinha-japandi-2.webp","alt":"Torre de eletros em madeira clara","caption":"Torre quente em madeira"},{"src":"/images/projects/cozinha-japandi-3.webp","alt":"Cozinha minimalista em tons neutros","caption":"Fachadas sem puxadores"}]'::jsonb, 'published', false, 7, '2026-02-01T12:00:00.000Z'::timestamptz, null, null, true)
on conflict (slug) do nothing;

-- Biblioteca de mídia (imagens locais em /public/images)
insert into public.media (id, bucket, path, url, alt, mime_type, width, height, created_at)
values
  ('5e3d0000-0000-4000-8000-000000000301', 'site-media', null, '/images/projects/cozinha-nogueira-cover.webp', 'Cozinha em nogueira com cristaleira iluminada', 'image/webp', 1600, 1748, '2026-01-01T12:00:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000302', 'site-media', null, '/images/projects/cozinha-nogueira-2.webp', 'Cozinha com ilha em pedra e armários escuros', 'image/webp', 1600, 1067, '2026-01-01T12:01:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000303', 'site-media', null, '/images/projects/cozinha-nogueira-3.webp', 'Aparador em nogueira', 'image/webp', 1600, 2400, '2026-01-01T12:02:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000304', 'site-media', null, '/images/projects/living-ripado-cover.webp', 'Living com painel de madeira', 'image/webp', 1600, 1088, '2026-01-01T12:03:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000305', 'site-media', null, '/images/projects/living-ripado-2.webp', 'Living com painel de madeira e lareira', 'image/webp', 1600, 1067, '2026-01-01T12:04:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000306', 'site-media', null, '/images/projects/living-ripado-3.webp', 'Nichos suspensos em madeira', 'image/webp', 1600, 1067, '2026-01-01T12:05:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000307', 'site-media', null, '/images/projects/suite-integrada-cover.webp', 'Suíte com parede escura', 'image/webp', 1600, 1016, '2026-01-01T12:06:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000308', 'site-media', null, '/images/projects/suite-integrada-2.webp', 'Quarto com cabeceira iluminada', 'image/webp', 1600, 1067, '2026-01-01T12:07:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000309', 'site-media', null, '/images/projects/suite-integrada-3.webp', 'Porta de guarda-roupa em madeira', 'image/webp', 1600, 2400, '2026-01-01T12:08:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000310', 'site-media', null, '/images/projects/banheiro-carvalho-cover.webp', 'Banheiro com gabinete suspenso em madeira', 'image/webp', 1600, 1067, '2026-01-01T12:09:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000311', 'site-media', null, '/images/projects/banheiro-carvalho-2.webp', 'Banheiro com banheira', 'image/webp', 1600, 2400, '2026-01-01T12:10:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000312', 'site-media', null, '/images/projects/banheiro-carvalho-3.webp', 'Gabinete suspenso em madeira clara', 'image/webp', 1600, 1060, '2026-01-01T12:11:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000313', 'site-media', null, '/images/projects/home-office-cover.webp', 'Bancada de trabalho em madeira', 'image/webp', 1600, 1067, '2026-01-01T12:12:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000314', 'site-media', null, '/images/projects/home-office-2.webp', 'Mesa de madeira com notebook', 'image/webp', 1600, 1068, '2026-01-01T12:13:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000315', 'site-media', null, '/images/projects/home-office-3.webp', 'Estante em madeira', 'image/webp', 1600, 2401, '2026-01-01T12:14:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000316', 'site-media', null, '/images/projects/gourmet-cover.webp', 'Sala de jantar aberta para o jardim', 'image/webp', 1600, 2133, '2026-01-01T12:15:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000317', 'site-media', null, '/images/projects/gourmet-2.webp', 'Living e jantar integrados', 'image/webp', 1600, 1067, '2026-01-01T12:16:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000318', 'site-media', null, '/images/projects/gourmet-3.webp', 'Mesa de jantar com divisória ripada', 'image/webp', 1600, 1067, '2026-01-01T12:17:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000319', 'site-media', null, '/images/projects/cozinha-japandi-cover.webp', 'Cozinha clara com ilha branca', 'image/webp', 1600, 1067, '2026-01-01T12:18:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000320', 'site-media', null, '/images/projects/cozinha-japandi-2.webp', 'Torre de eletros em madeira clara', 'image/webp', 1600, 2400, '2026-01-01T12:19:00.000Z'::timestamptz),
  ('5e3d0000-0000-4000-8000-000000000321', 'site-media', null, '/images/projects/cozinha-japandi-3.webp', 'Cozinha minimalista', 'image/webp', 1600, 1067, '2026-01-01T12:20:00.000Z'::timestamptz)
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
--  PRIMEIRO ADMIN
--  1. Supabase → Authentication → Users → "Add user" (e-mail + senha, auto-confirmar)
--  2. Rode, trocando o e-mail:
--
--  insert into public.admin_users (user_id, role)
--  select id, 'owner' from auth.users where email = 'voce@seudominio.com.br'
--  on conflict (user_id) do nothing;
-- ────────────────────────────────────────────────────────────────────────────
