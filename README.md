# W Studio — site + briefing interativo de móveis planejados

Site institucional de marcenaria/arquitetura de interiores com **briefing interativo em 5 etapas**, **painel administrativo** e **notificação de cada briefing por e-mail e WhatsApp**.

- **Front:** React 19 + React Router 7 (modo framework, SSR) + Vite 7 + Tailwind CSS 4
- **Dados:** Supabase (Postgres com RLS, Auth, Storage, Edge Functions)
- **Visual:** paleta Grafite & Nogueira (`#161616`, `#222222`, `#B37D4E`/`#C59B6D`, `#333333`, `#F0EDE6`) e **Cormorant Garamond** servida localmente
- **Funciona sem Docker:** roda na hora em *modo demonstração* e se conecta ao Supabase na nuvem só com `npx`.

---

## 1. Rodar agora (modo demonstração — sem configurar nada)

Requisitos: **Node 20.19+** (recomendado 22).

```bash
npm install
npm run dev
```

Abra **http://localhost:5173**.

| O quê | Onde |
|---|---|
| Site | `/`, `/projetos`, `/projetos/:slug`, `/servicos`, `/estudio`, `/privacidade` |
| Briefing | `/briefing` (também começa pelo card “Iniciar seu projeto” da home) |
| Painel | `/admin` → login **admin@demo.local** / **demo1234** |

No modo demonstração os dados ficam **na memória do servidor** (reiniciou, voltou ao conteúdo de exemplo), anexos não são enviados e nenhuma notificação é disparada — a prévia da mensagem aparece no terminal e no painel (Leads → lead → “Prévia da mensagem”). Uma faixa no topo avisa que é demonstração.

---

## 2. Arquitetura

```
architecture-studio/
├── app/
│   ├── root.jsx                 # HTML base, fontes, providers, erro global, window.__ENV
│   ├── routes.js                # mapa de rotas (URLs em português)
│   ├── entry.client.jsx / entry.server.jsx   # hidratação / SSR + cabeçalhos de segurança
│   ├── components/
│   │   ├── ui/                  # Button, Field, Choice (pílulas/checks/chips), Stepper, Dialog, Feedback…
│   │   └── shared/              # Logo (monograma do mockup), SiteHeader, SiteFooter, blocos de página
│   ├── layouts/                 # PublicLayout (cabeçalho/rodapé) e AdminLayout (barra lateral + login obrigatório)
│   ├── routes/                  # páginas públicas e do painel (loader/action de cada uma)
│   ├── features/
│   │   ├── projects/            # project.service.js · project.schema.js · project.components.jsx
│   │   ├── media/               # biblioteca de imagens (upload, seletor, uso)
│   │   ├── leads/               # briefing: opções, validação, formatação, assistente, painel
│   │   │   └── briefing/        # BriefingWizard + etapas + card da home
│   │   ├── services/            # serviços do estúdio
│   │   ├── auth/                # login admin (Supabase Auth ou sessão demo)
│   │   └── settings/            # textos/contatos do site e destinos das notificações
│   ├── lib/                     # supabase.browser/server, query-client, env.server, banco demo
│   ├── styles/                  # tokens.css (paleta), typography.css, globals.css
│   └── utils/                   # slugify, format-date, image-url, phone, seo…
├── public/                      # favicon, robots.txt, imagens de demonstração (WebP)
├── supabase/
│   ├── config.toml
│   ├── migrations/0001_initial_schema.sql   # tabelas, RLS, gatilhos, buckets e políticas
│   ├── seed.sql                              # conteúdo de exemplo (gerado)
│   ├── tests/database.test.sql               # pgTAP (34 asserções de RLS/constraints)
│   └── functions/
│       ├── create-lead/index.ts             # recebe o briefing, valida, grava, notifica
│       ├── notify-lead/index.ts             # (re)envia a notificação
│       └── _shared/                          # lógica testável + contratos sincronizados
├── tests/  unit/ · integration/ · e2e/ · functions/
├── scripts/                     # sync-contracts.mjs · generate-seed.mjs
├── .env.example · package.json · vite.config.js · react-router.config.js · playwright.config.js
```

**Uma única regra de validação para tudo.** `app/features/leads/{briefing.options, lead.schema, lead.mapper, lead.format}.js` são usados pelo navegador, pelo servidor do site **e** pelas Edge Functions (copiados para `supabase/functions/_shared/` com `npm run sync:contracts`; um teste falha se as cópias divergirem).

### Fluxo do briefing

```
Navegador ── valida etapa a etapa (zod) ── salva rascunho no navegador
   │
   ├─ anexos ──► Storage "briefing-uploads" (privado; visitante só pode ENVIAR para <uuid>/)
   │
   └─ JSON ──► action /briefing (SSR) ── valida de novo ──► Edge Function create-lead
                                                             │  honeypot + limites (IP, WhatsApp, global)
                                                             │  confere anexos realmente enviados
                                                             ├─► INSERT public.leads (service role)
                                                             └─► notifica: e-mail (Resend) + WhatsApp
Painel /admin/leads ◄── lê com o login do admin (RLS is_admin) · status · anotações · reenviar · CSV
```

---

## 3. Conectar ao Supabase (sem Docker)

> Tudo abaixo usa o Supabase **na nuvem** e o CLI via `npx` — nada de Docker. (Docker só seria necessário para `supabase start`, o ambiente local completo, que é opcional.)

### 3.1 Criar o projeto
1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**).
2. Em **Project Settings → API** copie a **Project URL** e a chave pública (**anon** / publishable).
3. Copie `.env.example` para `.env` e preencha:

```env
SITE_URL=https://seusite.com.br
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SESSION_SECRET=um-texto-longo-e-aleatorio
```

### 3.2 Criar as tabelas
```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF     # pede a senha do banco
npx supabase db push                                # aplica supabase/migrations
```
Depois abra **SQL Editor**, cole o conteúdo de `supabase/seed.sql` e execute (conteúdo de exemplo — opcional).

> Alternativa 100 % pelo navegador: cole `supabase/migrations/0001_initial_schema.sql` no SQL Editor e execute; depois o `seed.sql`.

### 3.3 Criar o primeiro administrador
1. **Authentication → Users → Add user** (e-mail + senha, marque *auto confirm*).
2. No SQL Editor:
```sql
insert into public.admin_users (user_id, role)
select id, 'owner' from auth.users where email = 'voce@seudominio.com.br';
```
Só entra no painel quem estiver em `admin_users` — qualquer outra conta é recusada. Mesmo assim, desligue o cadastro aberto em **Authentication → Sign In / Providers → “Allow new users to sign up”**.

### 3.4 Publicar as Edge Functions
```bash
cp supabase/functions/.env.example supabase/functions/.env   # preencha (seção 4)
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy create-lead --use-api --no-verify-jwt
npx supabase functions deploy notify-lead --use-api --no-verify-jwt
```
`--use-api` empacota as funções nos servidores do Supabase (dispensa Docker). As duas funções fazem a própria autenticação (o formulário é público; o reenvio exige login de admin ou segredo), por isso `--no-verify-jwt` — o mesmo já está no `config.toml`.

Pronto: `npm run dev` agora usa o Supabase (a faixa “Modo demonstração” some).

---

## 4. Receber os briefings no e-mail e no WhatsApp

Os destinos podem ser definidos no **painel → Configurações → Notificações** (prioridade) ou nas variáveis `NOTIFY_EMAIL_TO` / `NOTIFY_WHATSAPP_TO`. As **chaves** dos provedores ficam só nos segredos das Edge Functions.

### E-mail — [Resend](https://resend.com)
1. Crie a conta e gere uma **API key** → `RESEND_API_KEY`.
2. Verifique o seu domínio (registros DNS indicados pelo Resend) e use um remetente dele: `NOTIFY_EMAIL_FROM="Briefing <briefing@seudominio.com.br>"`.
   *Para testar antes do DNS:* `Briefing <onboarding@resend.dev>` — só entrega para o e-mail da sua própria conta Resend.

O e-mail chega formatado (todas as respostas por ambiente), com **Responder no WhatsApp**, link para o painel e anexos com link válido por 7 dias. O *Responder* do e-mail vai direto para o cliente (quando ele informa e-mail).

### WhatsApp — escolha um provedor (`WHATSAPP_PROVIDER`)

| Provedor | Custo | Para quê | Variáveis |
|---|---|---|---|
| `callmebot` (padrão) | grátis, não oficial | avisar **o seu próprio número** | `CALLMEBOT_API_KEY` |
| `meta` | oficial (WhatsApp Cloud API) | número comercial; exige **template aprovado** fora da janela de 24 h | `META_WA_TOKEN`, `META_WA_PHONE_NUMBER_ID`, `META_WA_TEMPLATE` |
| `twilio` | pago | sandbox/número Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |

**CallMeBot (mais rápido):** siga [callmebot.com/blog/free-api-whatsapp-messages](https://www.callmebot.com/blog/free-api-whatsapp-messages/) — você manda uma mensagem de autorização do seu WhatsApp e recebe a `apikey`. Coloque seu número em `NOTIFY_WHATSAPP_TO` (ex.: `5548999999999`).

**Meta:** crie um template com 4 variáveis no corpo, por exemplo
`Novo briefing de {{1}} ({{2}}) — ambientes: {{3}}. Detalhes: {{4}}`.

### Conferir
Envie um briefing pelo site → abra **/admin/leads** → o lead mostra “E-mail: enviado / WhatsApp: enviado” (ou o motivo da falha). O botão **Reenviar notificação** dispara de novo.

*Avançado:* para notificar por **Database Webhook** em vez de dentro do `create-lead`, defina `NOTIFY_ON_CREATE=false` e `NOTIFY_SECRET`, e crie um webhook *INSERT em `public.leads` → função `notify-lead`* com o cabeçalho `x-notify-secret`.

Além da notificação automática, a tela de sucesso tem o botão **Avisar pelo WhatsApp** (link `wa.me` para o número do estúdio com o protocolo) — funciona mesmo sem provedor configurado.

---

## 5. Publicar o site

É um servidor Node (SSR):

```bash
npm run build
npm start            # react-router-serve na porta $PORT (padrão 3000)
```

Funciona em Render, Railway, Fly.io, uma VPS, etc. Configure as variáveis do `.env` no provedor (`SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_SECRET`). Para Vercel/Netlify use o adaptador do React Router da plataforma (ex.: `@vercel/react-router`).

Depois do deploy, ajuste em **Supabase → Authentication → URL Configuration** o *Site URL* para o domínio final, e `ALLOWED_ORIGINS`/`SITE_URL` nos segredos das funções.

---

## 6. Personalizar

| Quero mudar… | Onde |
|---|---|
| Nome, slogan, textos da home/estúdio, WhatsApp, e-mail, endereço, horário, SEO | **Painel → Configurações** (sem código) |
| Projetos, fotos, destaques da home | **Painel → Projetos** e **Mídia** |
| Serviços | **Painel → Serviços** |
| Paleta | `app/styles/tokens.css` (contrastes documentados no arquivo) |
| Perguntas do briefing (ambientes, opções, materiais, estilos) | `app/features/leads/briefing.options.js` → depois `npm run sync:contracts` e publique as funções |
| Conteúdo de exemplo / `seed.sql` | `app/lib/demo-data.js` → `npm run seed:generate` |

Os 7 projetos que vêm no modelo são **exemplos com fotos ilustrativas** (marcados `is_sample`): o painel mostra um aviso até eles serem editados com os projetos reais ou excluídos. Os contatos de exemplo (`contato@seudominio.com.br`, `(48) 99999-9999`) também precisam ser trocados em Configurações.

---

## 7. Testes

```bash
npm test                 # unitários + integração (Vitest)
npm run test:e2e         # ponta a ponta no build de produção (Playwright)
npm run test:functions   # Edge Functions (Deno)
```

- **Unitários:** validação do briefing, máscara/normalização de telefone, formatação de e-mail/WhatsApp (incluindo escape de HTML), CSV, rascunho, banco demo, assistente renderizado (jsdom) do início ao envio.
- **Integração:** loaders/actions reais das rotas; **banco Postgres de verdade via PGlite (WebAssembly, sem Docker)** aplicando a migração + seed e rodando a suíte pgTAP de `supabase/tests/`; fiação do modo Supabase (login com cookie, `admin_users`, chamada à função).
- **E2E:** briefing completo com anexo → sucesso → lead no painel; criação de projeto; configurações; celular sem rolagem horizontal; **acessibilidade WCAG AA com axe** nas páginas principais.
  Na primeira vez: `npx playwright install chromium`.
- **Edge Functions:** honeypot, validação, limites por IP/WhatsApp, anexos, CallMeBot/Meta/Twilio/Resend com rede simulada, autenticação do `notify-lead`. Requer [Deno](https://deno.com) (`npm i -g deno` também funciona).
- Com Docker (opcional): `npx supabase test db` roda o pgTAP no Postgres local do Supabase.

---

## 8. Segurança e LGPD

- RLS em todas as tabelas; leads só são lidos/alterados por admins; inserção só pela função (service role).
- Anexos em bucket **privado**; visitante só envia para `<uuid>/arquivo`; o painel gera links temporários.
- Honeypot anti-robô, limites de envio (5 por IP/10 min, 3 por WhatsApp/hora, 100 por hora no total — configuráveis); IP guardado só como hash.
- Links de referência aceitos só em `http(s)`; todo conteúdo do cliente é escapado no e-mail; CSV protegido contra injeção de fórmula.
- Cabeçalhos de segurança nas páginas; painel com `noindex` e sem cache.
- Consentimento explícito na última etapa (registrado com data) e página `/privacidade` modelo, baseada na LGPD — **revise com um profissional jurídico**.

---

## 9. O que mudou em relação ao componente original

O fluxo, os textos e as opções do `configurador_de_briefing_interativo` foram mantidos; além do novo visual (paleta, Cormorant Garamond, layout do mockup), estes pontos foram corrigidos/completados:

- O texto livre dos ambientes sem perguntas próprias **não era salvo**; agora **todos os 6 ambientes** têm perguntas específicas (cozinha, quarto, living, office, banheiro, gourmet) e tudo vai no briefing.
- Os status iniciais dos eletros (“Comprar (Indução)”) não batiam com os botões (“Comprar”), então nada aparecia marcado; a adega estava no estado mas não na tela; “fechamento do guarda-roupa” e “observações” existiam sem campo. Tudo alinhado.
- O formulário vinha **pré-preenchido com dados fictícios** e a revisão mostrava “Mariana Albuquerque” quando o nome estava vazio; agora começa limpo e só mostra o que foi preenchido.
- Campos marcados com * não eram validados; agora cada etapa valida (mesma regra no servidor e na função) e leva o foco ao primeiro erro.
- O upload era apenas visual; agora envia PDF/JPG/PNG/WebP/HEIC (até 8 × 25 MB) para armazenamento privado, além de links do Pinterest/Instagram.
- Cartões clicáveis eram `div`s sem teclado; agora são controles acessíveis (rádio/checkbox), com foco visível e navegação por setas nas abas.
- Inclusos: e-mail opcional, máscara de WhatsApp, rascunho automático, consentimento LGPD e número do WhatsApp configurável (antes fixo no código).

---

Fotos de demonstração: [Unsplash](https://unsplash.com) — lista em `public/images/CREDITS.md`.
