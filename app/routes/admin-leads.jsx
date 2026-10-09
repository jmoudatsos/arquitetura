import { Download, Inbox, RefreshCw, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { data, Form, Link, useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { AdminPageHeader, adminMeta } from "../components/shared/AdminPage.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Dialog } from "../components/ui/Dialog.jsx";
import { controlClasses, TextAreaField } from "../components/ui/Field.jsx";
import { Alert, EmptyState } from "../components/ui/Feedback.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { LEAD_STATUSES } from "../features/leads/briefing.options.js";
import {
  AttachmentCount,
  LeadDetail,
  LeadRoomsList,
  LeadStatusSelect,
  leadsToCsv,
  NotificationSummary,
} from "../features/leads/lead.components.jsx";
import { formatPhoneDisplay } from "../features/leads/lead.mapper.js";
import {
  countLeadsByStatus,
  deleteLead,
  getLead,
  listLeads,
  resendLeadNotification,
  signAttachmentLinks,
  updateLeadNotes,
  updateLeadStatus,
} from "../features/leads/lead.service.js";
import { cn } from "../utils/cn.js";
import { isUuid } from "../utils/uuid.js";
import { formatDateTime, formatRelative } from "../utils/format-date.js";

export const meta = () => adminMeta("Leads");

export async function loader({ request }) {
  const { db, headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const leadParam = url.searchParams.get("lead");
  const leadId = isUuid(leadParam) ? leadParam : null;

  const [leads, stats, selected] = await Promise.all([
    listLeads(db, { status, q }),
    countLeadsByStatus(db),
    leadId ? getLead(db, leadId) : null,
  ]);
  const attachmentLinks = selected ? await signAttachmentLinks(db, selected) : {};

  return data({ leads, stats, status, q, selected, attachmentLinks }, { headers });
}

export async function action({ request }) {
  const { db, headers, demo } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return data({ ok: false, intent, message: "Lead não informado." }, { status: 400, headers });

  if (intent === "status") {
    const { error } = await updateLeadStatus(db, id, String(formData.get("status")));
    return data({ ok: !error, intent, message: error?.message ?? "Status atualizado." }, { status: error ? 400 : 200, headers });
  }
  if (intent === "notes") {
    const { error } = await updateLeadNotes(db, id, formData.get("internal_notes"));
    return data({ ok: !error, intent, message: error?.message ?? "Anotações salvas." }, { status: error ? 400 : 200, headers });
  }
  if (intent === "resend") {
    const result = await resendLeadNotification(db, id, { demo });
    return data({ ok: result.ok, intent, message: result.message }, { status: result.ok ? 200 : 502, headers });
  }
  if (intent === "delete") {
    const { error } = await deleteLead(db, id);
    return data({ ok: !error, intent, message: error?.message ?? "Lead excluído." }, { status: error ? 400 : 200, headers });
  }
  return data({ ok: false, intent, message: "Ação desconhecida." }, { status: 400, headers });
}

function downloadCsv(leads) {
  const blob = new Blob([leadsToCsv(leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: `leads-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function LeadDialog({ lead, attachmentLinks, onClose }) {
  const notes = useFetcher();
  const resend = useFetcher();
  const remover = useFetcher();
  const [notesValue, setNotesValue] = useState(lead.internal_notes ?? "");

  useEffect(() => {
    if (remover.state === "idle" && remover.data?.ok && remover.data.intent === "delete") onClose();
  }, [remover.state, remover.data, onClose]);

  return (
    <Dialog
      open
      onClose={onClose}
      title={lead.name}
      description={`${formatPhoneDisplay(lead.whatsapp)} · recebido em ${formatDateTime(lead.created_at)}`}
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <LeadDetail lead={lead} attachmentLinks={attachmentLinks} />

        <div className="space-y-6 lg:border-l lg:border-line lg:pl-6">
          <div>
            <p className="label-caps mb-2 text-mute">Status</p>
            <LeadStatusSelect lead={lead} />
          </div>

          <notes.Form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="notes" />
            <input type="hidden" name="id" value={lead.id} />
            <TextAreaField
              label="Anotações internas"
              name="internal_notes"
              rows={6}
              maxLength={4000}
              value={notesValue}
              onChange={(event) => setNotesValue(event.target.value)}
              hint="Visível só para a equipe."
            />
            <Button type="submit" variant="secondary" size="sm" loading={notes.state !== "idle"}>
              Salvar anotações
            </Button>
            {notes.data?.intent === "notes" && notes.state === "idle" && (
              <p className={cn("text-[0.9375rem]", notes.data.ok ? "text-sage" : "text-clay")}>{notes.data.message}</p>
            )}
          </notes.Form>

          <div>
            <p className="label-caps mb-2 text-mute">Notificação</p>
            <NotificationSummary notification={lead.notification} />
            <resend.Form method="post" className="mt-3">
              <input type="hidden" name="intent" value="resend" />
              <input type="hidden" name="id" value={lead.id} />
              <Button type="submit" variant="ghost" size="sm" className="px-2" loading={resend.state !== "idle"}>
                {resend.state === "idle" && <RefreshCw className="size-4" aria-hidden="true" />} Reenviar notificação
              </Button>
            </resend.Form>
            {resend.data?.intent === "resend" && resend.state === "idle" && (
              <p className={cn("mt-2 text-[0.9375rem]", resend.data.ok ? "text-sage" : "text-clay")}>{resend.data.message}</p>
            )}
            {lead.notification?.preview && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[0.9375rem] text-faint">Prévia da mensagem</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-xs border border-line bg-ink p-3 text-[0.8125rem] whitespace-pre-wrap text-mute">
                  {lead.notification.preview}
                </pre>
              </details>
            )}
          </div>

          <remover.Form
            method="post"
            onSubmit={(event) => {
              if (!window.confirm(`Excluir o briefing de ${lead.name}? Os anexos também serão apagados.`)) event.preventDefault();
            }}
            className="border-t border-line pt-5"
          >
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={lead.id} />
            <Button type="submit" variant="danger" size="sm" loading={remover.state !== "idle"}>
              <Trash2 className="size-4" aria-hidden="true" /> Excluir lead
            </Button>
            {remover.data?.ok === false && <p className="mt-2 text-[0.9375rem] text-clay">{remover.data.message}</p>}
          </remover.Form>
        </div>
      </div>
    </Dialog>
  );
}

export default function AdminLeads() {
  const { leads, stats, status, q, selected, attachmentLinks } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const linkWith = (patch) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    return `/admin/leads${query ? `?${query}` : ""}`;
  };

  const closeDialog = () => navigate(linkWith({ lead: null }), { preventScrollReset: true, replace: true });

  return (
    <>
      <AdminPageHeader
        title="Leads"
        description="Briefings recebidos pelo site. Clique em um lead para ver tudo, mudar o status e anotar."
        actions={
          <Button variant="secondary" size="sm" onClick={() => downloadCsv(leads)} disabled={!leads.length}>
            <Download className="size-4" aria-hidden="true" /> Exportar CSV
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
          {[{ id: "", label: "Todos", count: stats.total }, ...LEAD_STATUSES.map((s) => ({ ...s, count: stats.byStatus[s.id] }))].map(
            (item) => (
              <Link
                key={item.id || "todos"}
                to={linkWith({ status: item.id, lead: null })}
                aria-current={status === item.id ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[0.9375rem] transition-colors",
                  status === item.id ? "border-walnut bg-walnut text-ink" : "border-line text-mute hover:border-field hover:text-bone",
                )}
              >
                {item.label}
                <span className="tabular text-[0.8125rem] opacity-75">{item.count ?? 0}</span>
              </Link>
            ),
          )}
        </nav>

        <Form method="get" className="flex gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="lead-search" className="sr-only">
            Buscar leads
          </label>
          <input
            id="lead-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Nome, cidade, e-mail ou telefone"
            className={cn(controlClasses, "h-10 w-full py-0 xl:w-80")}
          />
          <Button type="submit" variant="secondary" size="sm" className="h-10" aria-label="Buscar">
            <Search className="size-4" />
          </Button>
        </Form>
      </div>

      {leads.length === 0 ? (
        <EmptyState icon={Inbox} title={q || status ? "Nenhum lead com esses filtros" : "Nenhum briefing recebido ainda"}>
          {q || status ? <Link to="/admin/leads" className="text-caramel underline">Limpar filtros</Link> : "Divulgue o link /briefing!"}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line">
          <table className="w-full min-w-[56rem] text-left">
            <thead className="border-b border-line bg-panel">
              <tr className="text-[0.8125rem] tracking-[0.14em] text-faint uppercase">
                <th scope="col" className="px-4 py-3 font-semibold">Recebido</th>
                <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                <th scope="col" className="px-4 py-3 font-semibold">Ambientes</th>
                <th scope="col" className="px-4 py-3 font-semibold">Investimento</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((lead) => (
                <tr key={lead.id} className={cn("transition-colors hover:bg-panel/60", lead.status === "novo" && "bg-walnut/5")}>
                  <td className="px-4 py-3.5 align-top text-[0.9375rem] whitespace-nowrap text-faint">
                    <time dateTime={lead.created_at} title={formatDateTime(lead.created_at)} suppressHydrationWarning>
                      {formatRelative(lead.created_at)}
                    </time>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <Link to={linkWith({ lead: lead.id })} preventScrollReset className="block text-[1.125rem] text-bone hover:text-caramel">
                      {lead.name}
                    </Link>
                    <span className="tabular text-[0.9375rem] text-faint">
                      {formatPhoneDisplay(lead.whatsapp)}
                      {lead.city ? ` · ${lead.city}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top text-[1rem] text-mute">
                    <LeadRoomsList rooms={lead.rooms} /> <AttachmentCount attachments={lead.attachments} />
                  </td>
                  <td className="px-4 py-3.5 align-top text-[1rem] text-mute">{lead.budget_range ?? "—"}</td>
                  <td className="px-4 py-3.5 align-top">
                    <LeadStatusSelect lead={lead} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {searchParams.get("lead") && !selected && (
        <Alert tone="warning" className="mt-6">
          Lead não encontrado (talvez tenha sido excluído).
        </Alert>
      )}
      {selected && (
        <LeadDialog key={selected.id} lead={selected} attachmentLinks={attachmentLinks} onClose={closeDialog} />
      )}
    </>
  );
}
