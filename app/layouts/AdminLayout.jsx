import { ExternalLink, Images, Inbox, LayoutDashboard, LogOut, Menu, PanelsTopLeft, Settings, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import { data, Form, Link, NavLink, Outlet, useLoaderData, useLocation, useNavigation, useRouteLoaderData } from "react-router";
import { DemoBanner } from "../components/shared/Blocks.jsx";
import { LogoMark } from "../components/shared/Logo.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { countLeadsByStatus } from "../features/leads/lead.service.js";
import { countSampleProjects } from "../features/projects/project.service.js";
import { cn } from "../utils/cn.js";

export async function loader({ request }) {
  const { user, db, headers, demo } = await requireAdmin(request);
  const [leadStats, sampleProjects] = await Promise.all([countLeadsByStatus(db), countSampleProjects(db)]);
  return data({ user, demo, newLeads: leadStats.byStatus.novo ?? 0, sampleProjects }, { headers });
}

const NAV = [
  { to: "/admin", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/admin/leads", label: "Leads", icon: Inbox, badge: "newLeads" },
  { to: "/admin/projetos", label: "Projetos", icon: PanelsTopLeft },
  { to: "/admin/midia", label: "Mídia", icon: Images },
  { to: "/admin/servicos", label: "Serviços", icon: Wrench },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function Sidebar({ counts, user, studioName, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-3 px-6 py-6" onClick={onNavigate}>
        <LogoMark letter={(studioName?.[0] ?? "W").toUpperCase()} className="h-8" />
        <span className="leading-tight">
          <span className="block text-[1rem] font-semibold tracking-[0.2em] text-bone uppercase">{studioName}</span>
          <span className="block text-[0.8125rem] tracking-[0.18em] text-faint uppercase">Painel</span>
        </span>
      </Link>

      <nav aria-label="Painel" className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex h-11 items-center gap-3 rounded-sm px-3 text-[1.0625rem] transition-colors",
                    isActive ? "bg-walnut/15 text-caramel" : "text-mute hover:bg-panel-raised hover:text-bone",
                  )
                }
              >
                <Icon className="size-[1.125rem]" strokeWidth={1.6} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {badge && counts[badge] > 0 && (
                  <span className="tabular rounded-full bg-walnut px-2 py-0.5 text-[0.8125rem] font-semibold text-ink">
                    {counts[badge]}
                    <span className="sr-only"> novos</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-line px-3 py-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center gap-3 rounded-sm px-3 text-[1rem] text-mute hover:bg-panel-raised hover:text-bone"
        >
          <ExternalLink className="size-4" aria-hidden="true" /> Ver site
        </a>
        <Form method="post" action="/admin/login">
          <input type="hidden" name="intent" value="logout" />
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-3 rounded-sm px-3 text-left text-[1rem] text-mute hover:bg-panel-raised hover:text-bone"
          >
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </Form>
        <p className="truncate px-3 pt-2 text-[0.875rem] text-faint" title={user.email}>
          {user.email}
        </p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, demo, newLeads, sampleProjects } = useLoaderData();
  const root = useRouteLoaderData("root");
  const studioName = root?.settings?.studio_name ?? "Studio";
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  const counts = { newLeads, sampleProjects };

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      {demo && <DemoBanner admin />}
      <div className="flex flex-1">
        {/* Barra lateral (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-ink-soft lg:block">
          <Sidebar counts={counts} user={user} studioName={studioName} />
        </aside>

        {/* Gaveta (celular) */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
            <button type="button" className="absolute inset-0 bg-black/60" aria-label="Fechar menu" onClick={() => setOpen(false)} />
            <aside className="relative h-full w-72 max-w-[85vw] animate-fade-in border-r border-line bg-ink-soft">
              <button
                type="button"
                className="absolute top-5 right-4 rounded-sm p-2 text-mute hover:text-bone"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
              <Sidebar counts={counts} user={user} studioName={studioName} onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-line px-4 lg:hidden">
            <button type="button" className="rounded-sm p-2 text-bone" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu className="size-6" />
            </button>
            <span className="text-[1rem] font-semibold tracking-[0.2em] text-bone uppercase">Painel</span>
            <span className="w-10" />
          </header>

          {/* Indicador de carregamento entre páginas */}
          <div
            aria-hidden="true"
            className={cn(
              "h-0.5 bg-walnut transition-all duration-500",
              navigation.state === "loading" ? "w-2/3 opacity-100" : "w-0 opacity-0",
            )}
          />

          <main id="conteudo" className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
            {sampleProjects > 0 && location.pathname !== "/admin/projetos" && (
              <div className="mb-6 rounded-sm border border-walnut/40 bg-walnut/8 px-4 py-3 text-[1rem] text-mute">
                Há <strong className="text-bone">{sampleProjects}</strong> projeto(s) de exemplo publicados no site.{" "}
                <Link to="/admin/projetos" className="text-caramel underline underline-offset-4">
                  Substitua pelos projetos reais
                </Link>
                .
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="eyebrow text-caramel">Painel</p>
      <h1 className="mt-3 text-[2.25rem] text-bone">Não foi possível carregar esta página</h1>
      <p className="mt-4 text-mute">{error instanceof Error ? error.message : "Erro inesperado."}</p>
      <a href="/admin" className="mt-8 inline-block text-caramel underline underline-offset-4">
        Voltar ao painel
      </a>
    </main>
  );
}
