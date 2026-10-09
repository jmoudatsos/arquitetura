import { Download, ExternalLink, FileText, MessageCircle, Paperclip } from "lucide-react";
import { useId } from "react";
import { useFetcher } from "react-router";
import { Badge } from "../../components/ui/Layout.jsx";
import { cn } from "../../utils/cn.js";
import { formatDateTime } from "../../utils/format-date.js";
import { getRoom, LEAD_STATUSES } from "./briefing.options.js";
import { buildWhatsAppUrl, describeLead, formatBytes } from "./lead.format.js";
import { formatPhoneDisplay } from "./lead.mapper.js";

const STATUS_TONES = {
  novo: "solid",
  em_contato: "walnut",
  proposta: "walnut",
  fechado: "sage",
  perdido: "neutral",
};

export function LeadStatusBadge({ status }) {
  const label = LEAD_STATUSES.find((item) => item.id === status)?.label ?? status;
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{label}</Badge>;
}

/** Select de status que salva sozinho (fetcher). */
export function LeadStatusSelect({ lead, className }) {
  const fetcher = useFetcher();
  // useId: o mesmo lead aparece na tabela e no modal — ids precisam ser únicos.
  const selectId = useId();
  const pending = fetcher.formData?.get("status");
  const value = pending ?? lead.status;
  return (
    <fetcher.Form method="post" className={className}>
      <input type="hidden" name="intent" value="status" />
      <input type="hidden" name="id" value={lead.id} />
      <label className="sr-only" htmlFor={selectId}>
        Status de {lead.name}
      </label>
      <select
        id={selectId}
        name="status"
        value={value}
        onChange={(event) => fetcher.submit(event.currentTarget.form)}
        className="h-9 cursor-pointer rounded-xs border border-field bg-ink pr-9 pl-3 text-[0.9375rem] text-bone hover:border-mute focus:border-caramel"
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status.id} value={status.id}>
            {status.label}
          </option>
        ))}
      </select>
    </fetcher.Form>
  );
}

export function NotificationSummary({ notification }) {
  const items = [
    ["E-mail", notification?.email],
    ["WhatsApp", notification?.whatsapp],
  ];
  const toneOf = (status) => (status === "sent" ? "sage" : status === "failed" ? "clay" : "neutral");
  const labelOf = (status) =>
    ({ sent: "enviado", failed: "falhou", skipped: "não enviado", disabled: "desativado" })[status] ?? "pendente";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([label, info]) => (
        <span key={label} title={info?.detail ?? ""}>
          <Badge tone={toneOf(info?.status)}>
            {label}: {labelOf(info?.status)}
          </Badge>
        </span>
      ))}
    </div>
  );
}

/** Ficha completa do lead (painel lateral). */
export function LeadDetail({ lead, attachmentLinks = {} }) {
  const sections = describeLead(lead, { attachmentLinks });
  const firstName = lead.name.split(" ")[0];
  const whatsappUrl = buildWhatsAppUrl(lead.whatsapp, `Olá ${firstName}, tudo bem? Aqui é do estúdio — recebemos seu briefing!`);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-walnut px-4 text-[0.875rem] font-semibold tracking-[0.12em] text-ink uppercase hover:bg-caramel"
        >
          <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
        </a>
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-field px-4 text-[0.875rem] font-semibold tracking-[0.12em] text-bone uppercase hover:border-caramel hover:text-caramel"
          >
            E-mail
          </a>
        )}
      </div>

      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="eyebrow mb-2 border-b border-line pb-2 text-caramel">{section.title}</h3>
          <dl className="divide-y divide-line/60">
            {section.rows.map(([label, value, href], index) => {
              const isAttachment = label === "Anexo";
              return (
                <div key={`${label}-${index}`} className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="text-[0.9375rem] text-faint">{label}</dt>
                  <dd className="min-w-0 text-[1.0625rem] break-words whitespace-pre-line text-bone">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-caramel hover:underline"
                      >
                        {isAttachment ? <Download className="size-4" aria-hidden="true" /> : <ExternalLink className="size-4" aria-hidden="true" />}
                        {value}
                      </a>
                    ) : (
                      <span className={cn(isAttachment && "inline-flex items-center gap-1.5")}>
                        {isAttachment && <Paperclip className="size-4 text-faint" aria-hidden="true" />}
                        {value}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      <section>
        <h3 className="eyebrow mb-2 border-b border-line pb-2 text-caramel">Registro</h3>
        <dl className="space-y-1.5 text-[0.9375rem]">
          <div className="flex gap-2">
            <dt className="text-faint">Recebido em:</dt>
            <dd className="text-mute">{formatDateTime(lead.created_at)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-faint">Origem:</dt>
            <dd className="text-mute">
              {lead.source}
              {lead.utm?.utm_source ? ` · ${lead.utm.utm_source}` : ""}
              {lead.utm?.utm_campaign ? ` / ${lead.utm.utm_campaign}` : ""}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-faint">Consentimento LGPD:</dt>
            <dd className="text-mute">{lead.consent ? `sim, ${formatDateTime(lead.consent_at)}` : "não registrado"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-faint">ID:</dt>
            <dd className="tabular text-mute">{lead.id}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export function LeadRoomsList({ rooms }) {
  return <span>{(rooms ?? []).map((id) => getRoom(id)?.shortTitle ?? id).join(", ") || "—"}</span>;
}

export function AttachmentCount({ attachments }) {
  const count = attachments?.length ?? 0;
  if (!count) return null;
  const total = attachments.reduce((sum, file) => sum + (file.size ?? 0), 0);
  return (
    <span className="inline-flex items-center gap-1 text-[0.875rem] text-faint" title={formatBytes(total)}>
      <FileText className="size-3.5" aria-hidden="true" />
      {count}
    </span>
  );
}

/** CSV (separador ;) compatível com Excel em português. */
export function leadsToCsv(leads) {
  const columns = [
    ["Recebido em", (l) => formatDateTime(l.created_at)],
    ["Status", (l) => LEAD_STATUSES.find((s) => s.id === l.status)?.label ?? l.status],
    ["Nome", (l) => l.name],
    ["WhatsApp", (l) => formatPhoneDisplay(l.whatsapp).replace(/^\+/, "")],
    ["E-mail", (l) => l.email ?? ""],
    ["Cidade", (l) => l.city ?? ""],
    ["Imóvel", (l) => [l.property_type, l.property_status].filter(Boolean).join(" · ")],
    ["Início", (l) => l.start_forecast ?? ""],
    ["Investimento", (l) => l.budget_range ?? ""],
    ["Ambientes", (l) => (l.rooms ?? []).map((id) => getRoom(id)?.shortTitle ?? id).join(", ")],
    ["Estilo", (l) => l.style ?? ""],
    ["Observações", (l) => l.notes ?? ""],
  ];
  const escape = (value) => {
    let text = String(value ?? "");
    // Evita "injeção de fórmula" ao abrir no Excel/Sheets.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map(([name]) => escape(name)).join(";");
  const rows = leads.map((lead) => columns.map(([, get]) => escape(get(lead))).join(";"));
  return `﻿${[header, ...rows].join("\r\n")}`;
}
