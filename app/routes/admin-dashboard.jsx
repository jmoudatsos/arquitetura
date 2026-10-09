import { ArrowRight, Inbox } from "lucide-react";
import { data, Link, useLoaderData } from "react-router";
import { AdminPageHeader, adminMeta, StatTile } from "../components/shared/AdminPage.jsx";
import { ButtonLink } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { Card } from "../components/ui/Layout.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { LeadRoomsList, LeadStatusBadge } from "../features/leads/lead.components.jsx";
import { countLeadsByStatus, listLeads } from "../features/leads/lead.service.js";
import { listAllProjects } from "../features/projects/project.service.js";
import { getNotificationSettings } from "../features/settings/settings.service.js";
import { formatRelative } from "../utils/format-date.js";

export const meta = () => adminMeta("Painel");

export async function loader({ request }) {
  const { db, headers, demo } = await requireAdmin(request);
  const [stats, recent, projects, notifications] = await Promise.all([
    countLeadsByStatus(db),
    listLeads(db, { limit: 6 }),
    listAllProjects(db),
    getNotificationSettings(db),
  ]);
  return data(
    {
      stats,
      recent,
      projects: {
        published: projects.filter((p) => p.status === "published").length,
        drafts: projects.filter((p) => p.status === "draft").length,
      },
      notifications,
      demo,
      lastNotification: recent[0]?.notification ?? null,
    },
    { headers },
  );
}

export default function AdminDashboard() {
  const { stats, recent, projects, notifications, demo } = useLoaderData();
  const emailReady = notifications.email_enabled && notifications.email_recipients.length > 0;
  const whatsappReady = notifications.whatsapp_enabled && Boolean(notifications.whatsapp_recipient);

  return (
    <>
      <AdminPageHeader
        title="Painel"
        description="Visão geral dos briefings recebidos e do conteúdo do site."
        actions={<ButtonLink to="/admin/projetos/novo" size="sm">Novo projeto</ButtonLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Leads novos" value={stats.byStatus.novo ?? 0} tone="accent" hint="Aguardando primeiro contato" />
        <StatTile label="Últimos 30 dias" value={stats.last30} hint={`${stats.total} no total`} />
        <StatTile label="Em negociação" value={(stats.byStatus.em_contato ?? 0) + (stats.byStatus.proposta ?? 0)} hint="Em contato + proposta" />
        <StatTile label="Projetos no site" value={projects.published} hint={`${projects.drafts} rascunho(s)`} />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[1.5rem] text-bone">Briefings recentes</h2>
            <Link to="/admin/leads" className="inline-flex items-center gap-1.5 text-caramel hover:underline">
              Ver todos <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhum briefing ainda">
              Quando alguém enviar o formulário do site, ele aparece aqui.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((lead) => (
                <li key={lead.id}>
                  <Link
                    to={`/admin/leads?lead=${lead.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 transition-colors hover:text-caramel"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[1.125rem] text-bone">{lead.name}</span>
                      <span className="block text-[0.9375rem] text-faint">
                        <LeadRoomsList rooms={lead.rooms} />
                        {lead.budget_range ? ` · ${lead.budget_range}` : ""}
                      </span>
                    </span>
                    <LeadStatusBadge status={lead.status} />
                    <time className="w-24 text-right text-[0.9375rem] text-faint" dateTime={lead.created_at} suppressHydrationWarning>
                      {formatRelative(lead.created_at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="text-[1.5rem] text-bone">Notificações</h2>
          {demo ? (
            <p className="text-mute">
              Modo demonstração: nenhum envio real. Configure Supabase + Edge Functions para receber cada briefing por e-mail e
              WhatsApp.
            </p>
          ) : (
            <ul className="space-y-3 text-[1.0625rem]">
              <li className="flex items-center justify-between gap-3">
                <span className="text-mute">E-mail</span>
                <span className={emailReady ? "text-sage" : notifications.email_enabled ? "text-faint" : "text-clay"}>
                  {emailReady ? notifications.email_recipients.join(", ") : notifications.email_enabled ? "padrão (NOTIFY_EMAIL_TO)" : "desativado"}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-mute">WhatsApp</span>
                <span className={whatsappReady ? "text-sage" : notifications.whatsapp_enabled ? "text-faint" : "text-clay"}>
                  {whatsappReady ? `+${notifications.whatsapp_recipient}` : notifications.whatsapp_enabled ? "padrão (NOTIFY_WHATSAPP_TO)" : "desativado"}
                </span>
              </li>
            </ul>
          )}
          <p className="text-[0.9375rem] text-faint">
            Destinatários vazios usam as variáveis NOTIFY_EMAIL_TO / NOTIFY_WHATSAPP_TO das Edge Functions.
          </p>
          <ButtonLink to="/admin/configuracoes#notificacoes" variant="secondary" size="sm">
            Ajustar notificações
          </ButtonLink>
        </Card>
      </div>
    </>
  );
}
