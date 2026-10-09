import "@fontsource-variable/cormorant-garamond/wght.css";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "./styles/globals.css";

import { QueryClientProvider } from "@tanstack/react-query";
import {
  data,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { Logo } from "./components/shared/Logo.jsx";
import { ButtonLink } from "./components/ui/Button.jsx";
import { getSiteSettings } from "./features/settings/settings.service.js";
import { DEFAULT_SITE_SETTINGS } from "./features/settings/settings.defaults.js";
import { getPublicEnv } from "./lib/env.server.js";
import { getQueryClient } from "./lib/query-client.js";
import { getDb } from "./lib/supabase.server.js";
import { buildMeta } from "./utils/seo.js";

/** Meta padrão (usada pelas páginas de erro; cada rota define a sua). */
export const meta = ({ matches }) => buildMeta(matches);

export const links = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "manifest", href: "/site.webmanifest" },
];

export async function loader({ request }) {
  const { db, headers } = getDb(request);
  const settings = await getSiteSettings(db);
  return data({ settings, env: getPublicEnv() }, { headers });
}

/** Configurações mudam raramente: só recarrega o root depois de um envio de formulário. */
export function shouldRevalidate({ formMethod, defaultShouldRevalidate }) {
  if (formMethod && formMethod !== "GET") return defaultShouldRevalidate;
  return false;
}

/** JSON seguro para <script>: impede fechar a tag com "</script>". */
function serializeForScript(value) {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .split(LS)
    .join("\\u2028")
    .split(PS)
    .join("\\u2029");
}

export function Layout({ children }) {
  const rootData = useRouteLoaderData("root");
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#161616" />
        <meta name="format-detection" content="telephone=no" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-sm bg-walnut px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        {children}
        <ScrollRestoration />
        <script
          // Variáveis públicas para o navegador (URL e chave pública do Supabase).
          dangerouslySetInnerHTML={{ __html: `window.__ENV=${serializeForScript(rootData?.env ?? {})};` }}
        />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }) {
  const rootData = useRouteLoaderData("root");
  const settings = rootData?.settings ?? DEFAULT_SITE_SETTINGS;

  let status = 500;
  let title = "Algo saiu do esquadro";
  let message = "Tivemos um problema inesperado. Tente novamente em instantes.";
  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "Página não encontrada";
      message = "O endereço pode ter mudado ou o conteúdo foi removido.";
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    message = error.message;
  }

  return (
    <main id="conteudo" className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Link to="/" aria-label="Página inicial">
        <Logo name={settings.studio_name} />
      </Link>
      <p className="eyebrow mt-14 text-caramel">Erro {status}</p>
      <h1 className="display-caps mt-4 text-[2.75rem] text-bone sm:text-[3.5rem]">{title}</h1>
      <p className="mt-5 max-w-lg text-[1.1875rem] text-mute">{message}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/">Voltar ao início</ButtonLink>
        <ButtonLink to="/projetos" variant="secondary">
          Ver projetos
        </ButtonLink>
      </div>
      {import.meta.env.DEV && error instanceof Error && error.stack && (
        <pre className="mt-12 max-w-3xl overflow-x-auto rounded-sm border border-line bg-panel p-4 text-left text-[0.8125rem] text-faint">
          {error.stack}
        </pre>
      )}
    </main>
  );
}
