// ⚠️ ARQUIVO GERADO por scripts/sync-contracts.mjs — NÃO EDITE AQUI.
// Fonte: app/features/leads/lead.format.js  →  depois de editar a fonte, rode: npm run sync:contracts

/**
 * Formatação de um lead para leitura humana: texto do WhatsApp, e-mail HTML,
 * assunto e o painel admin. Compartilhado com as Edge Functions — mantenha puro.
 * Depois de editar: `npm run sync:contracts`.
 */
import { getRoom, getStyle, ROOM_QUESTIONS } from "./briefing.options.js";
import { formatPhoneDisplay } from "./lead.mapper.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Converte a resposta de uma pergunta em texto legível (vazio quando não respondida). */
export function answerToText(question, value) {
  if (value == null) return "";
  switch (question.type) {
    case "multi":
      return Array.isArray(value) ? value.join(", ") : "";
    case "matrix":
      return question.rows
        .filter((row) => value?.[row.id])
        .map((row) => `${row.label}: ${value[row.id]}`)
        .join("; ");
    default:
      return String(value).trim();
  }
}

/**
 * Estrutura o lead em seções { title, rows: [[rótulo, valor, href?]] }.
 * @param {object} lead  linha da tabela `leads`
 * @param {{ attachmentLinks?: Record<string, string> }} [options]  path → URL assinada
 */
export function describeLead(lead, { attachmentLinks = {} } = {}) {
  const sections = [];
  const push = (title, rows) => {
    const filled = rows.filter((row) => row[1] != null && String(row[1]).trim() !== "");
    if (filled.length) sections.push({ title, rows: filled });
  };

  push("Cliente & imóvel", [
    ["Nome", lead.name],
    ["WhatsApp", formatPhoneDisplay(lead.whatsapp)],
    ["E-mail", lead.email],
    ["Cidade / bairro", lead.city],
    ["Tipo de imóvel", lead.property_type],
    ["Momento do espaço", lead.property_status],
    ["Início previsto", lead.start_forecast],
    ["Investimento", lead.budget_range],
  ]);

  const rooms = lead.rooms ?? [];
  push("Ambientes", [["Selecionados", rooms.map((id) => getRoom(id)?.title ?? id).join(", ")]]);

  for (const roomId of rooms) {
    const answers = lead.room_details?.[roomId] ?? {};
    const rows = (ROOM_QUESTIONS[roomId] ?? []).map((question) => [
      question.label,
      answerToText(question, answers[question.id]),
    ]);
    const title = getRoom(roomId)?.title ?? roomId;
    if (rows.some((row) => row[1])) push(title, rows);
    else push(title, [["Detalhes", "Sem detalhes técnicos informados"]]);
  }

  push("Estilo & materiais", [
    ["Estilo", lead.style ? (getStyle(lead.style)?.title ?? lead.style) : ""],
    ["Materiais", (lead.materials ?? []).join(", ")],
  ]);

  const references = (lead.reference_links ?? []).map((url, index) => [
    `Link ${index + 1}`,
    url,
    isSafeHttpUrl(url) ? url : undefined,
  ]);
  const attachments = (lead.attachments ?? []).map((file) => [
    "Anexo",
    `${file.name} (${formatBytes(file.size)})`,
    attachmentLinks[file.path],
  ]);
  push("Referências & anexos", [...references, ...attachments]);

  push("Observações", [["Observações finais", lead.notes]]);

  return sections;
}

export function formatLeadSubject(lead) {
  const rooms = (lead.rooms ?? []).map((id) => getRoom(id)?.shortTitle ?? id);
  const where = rooms.length ? ` — ${rooms.join(", ")}` : "";
  return `Novo briefing: ${lead.name}${where}`;
}

/**
 * Texto para WhatsApp (negrito com *asteriscos*).
 * @param {{ adminUrl?: string, attachmentLinks?: Record<string,string>, maxLength?: number, heading?: string }} [options]
 */
export function formatLeadText(lead, options = {}) {
  const { adminUrl, attachmentLinks, maxLength, heading = "Novo briefing recebido" } = options;
  const lines = [`*${heading}*`];

  for (const section of describeLead(lead, { attachmentLinks })) {
    lines.push("", `*${section.title.toUpperCase()}*`);
    for (const [label, value, href] of section.rows) {
      lines.push(`• ${label}: ${value}${href && href !== value ? ` — ${href}` : ""}`);
    }
  }

  if (adminUrl) lines.push("", `Ver no painel: ${adminUrl}`);

  let text = lines.join("\n");
  if (maxLength && text.length > maxLength) {
    const suffix = adminUrl
      ? `\n…\n(mensagem resumida — veja tudo em ${adminUrl})`
      : "\n…\n(mensagem resumida)";
    text = text.slice(0, Math.max(0, maxLength - suffix.length)).trimEnd() + suffix;
  }
  return text;
}

/** Link click-to-chat do WhatsApp com a mensagem já preenchida. */
export function buildWhatsAppUrl(phone, text = "") {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

/**
 * E-mail HTML (tabelas + estilos inline para funcionar em Gmail/Outlook).
 * Todo conteúdo vindo do cliente passa por escapeHtml.
 */
export function formatLeadHtml(lead, options = {}) {
  const { adminUrl, attachmentLinks, studioName = "Estúdio" } = options;
  const sections = describeLead(lead, { attachmentLinks });
  const whatsappUrl = buildWhatsAppUrl(lead.whatsapp, `Olá ${lead.name.split(" ")[0]}, tudo bem? Recebemos seu briefing!`);

  const sectionHtml = sections
    .map(
      (section) => `
      <tr><td style="padding:28px 0 8px;font:600 12px/1.3 Georgia,serif;letter-spacing:2px;text-transform:uppercase;color:#B37D4E;border-bottom:1px solid #E6DFD3">${escapeHtml(section.title)}</td></tr>
      <tr><td style="padding:4px 0 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
          ${section.rows
            .map(([label, value, href]) => {
              const safeHref = href && isSafeHttpUrl(href) ? href : null;
              const content = safeHref
                ? `<a href="${escapeHtml(safeHref)}" style="color:#8A5A33">${escapeHtml(value)}</a>`
                : escapeHtml(value).replace(/\n/g, "<br>");
              return `<tr>
                <td valign="top" style="padding:7px 16px 7px 0;width:38%;font:14px/1.45 Georgia,serif;color:#7A7268">${escapeHtml(label)}</td>
                <td valign="top" style="padding:7px 0;font:15px/1.45 Georgia,serif;color:#222222">${content}</td>
              </tr>`;
            })
            .join("")}
        </table>
      </td></tr>`,
    )
    .join("");

  const button = (href, label, primary) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:3px;font:600 13px/1 Georgia,serif;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;${
      primary ? "background:#B37D4E;color:#161616" : "border:1px solid #B37D4E;color:#8A5A33"
    }">${escapeHtml(label)}</a>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(formatLeadSubject(lead))}</title></head>
<body style="margin:0;padding:0;background:#F4F1EB">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F1EB;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#FFFFFF;border:1px solid #E6DFD3">
        <tr><td style="background:#161616;padding:28px 32px">
          <div style="font:600 12px/1.3 Georgia,serif;letter-spacing:3px;text-transform:uppercase;color:#C59B6D">${escapeHtml(studioName)} · Briefing</div>
          <div style="margin-top:10px;font:400 28px/1.15 Georgia,serif;color:#F0EDE6">${escapeHtml(lead.name)}</div>
          <div style="margin-top:6px;font:15px/1.4 Georgia,serif;color:#A8A196">${escapeHtml(formatPhoneDisplay(lead.whatsapp))}${lead.city ? ` · ${escapeHtml(lead.city)}` : ""}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 0">
          ${button(whatsappUrl, "Responder no WhatsApp", true)}
          ${adminUrl && isSafeHttpUrl(adminUrl) ? button(adminUrl, "Abrir no painel", false) : ""}
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${sectionHtml}</table>
        </td></tr>
      </table>
      <div style="max-width:640px;padding:16px 8px;font:12px/1.5 Georgia,serif;color:#8F897F">Mensagem automática enviada pelo formulário de briefing do site. Os links de anexos expiram em 7 dias — depois disso, acesse pelo painel.</div>
    </td></tr>
  </table>
</body></html>`;
}
