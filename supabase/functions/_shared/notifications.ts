/**
 * Envio das notificações de novo briefing:
 *   • E-mail → Resend (https://resend.com)
 *   • WhatsApp → CallMeBot (padrão, grátis para avisar o seu próprio número),
 *                Meta WhatsApp Cloud API (oficial) ou Twilio.
 *
 * Nenhuma falha de notificação derruba o registro do lead: o resultado de cada
 * canal fica salvo em `leads.notification` e pode ser reenviado pelo painel.
 */
// deno-lint-ignore-file no-explicit-any
import { formatLeadHtml, formatLeadSubject, formatLeadText } from "./lead.format.js";
import { formatPhoneDisplay } from "./lead.mapper.js";
import { getRoom } from "./briefing.options.js";

export type ChannelStatus = "sent" | "failed" | "skipped" | "disabled";
export type ChannelResult = { status: ChannelStatus; detail?: string; id?: string };
export type NotificationRecord = { at: string; email: ChannelResult; whatsapp: ChannelResult };

const TIMEOUT_MS = 10_000;
const env = (name: string) => (Deno.env.get(name) ?? "").trim();

/* ─────────────────────────── configuração ─────────────────────────── */

export async function loadNotificationConfig(supabase: any) {
  const { data } = await supabase.from("notification_settings").select("*").eq("id", 1).maybeSingle();
  const envEmails = env("NOTIFY_EMAIL_TO")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const envWhatsapp = env("NOTIFY_WHATSAPP_TO").replace(/\D/g, "");
  return {
    emailEnabled: data?.email_enabled ?? true,
    emailTo: (data?.email_recipients?.length ? data.email_recipients : envEmails) as string[],
    whatsappEnabled: data?.whatsapp_enabled ?? true,
    whatsappTo: String(data?.whatsapp_recipient || envWhatsapp || ""),
  };
}

async function loadStudioName(supabase: any): Promise<string> {
  const { data } = await supabase.from("site_settings").select("studio_name").eq("id", 1).maybeSingle();
  return data?.studio_name || "Estúdio";
}

/** URLs assinadas (7 dias) para baixar os anexos direto do e-mail/WhatsApp. */
export async function signAttachments(supabase: any, lead: any, expiresIn = 7 * 24 * 3600) {
  const paths = (lead.attachments ?? []).map((file: any) => file.path).filter(Boolean);
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from("briefing-uploads").createSignedUrls(paths, expiresIn);
  if (error) {
    console.warn("[notify] falha ao assinar anexos:", error.message);
    return {};
  }
  return Object.fromEntries(
    (data ?? []).filter((item: any) => item.signedUrl).map((item: any) => [item.path, item.signedUrl]),
  );
}

/* ─────────────────────────── e-mail (Resend) ─────────────────────────── */

export async function sendEmail(input: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}): Promise<ChannelResult> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return { status: "skipped", detail: "RESEND_API_KEY não configurada" };
  const from = env("NOTIFY_EMAIL_FROM") || "Briefing <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { status: "failed", detail: `Resend ${response.status}: ${body?.message ?? "erro"}` };
    return { status: "sent", id: body?.id };
  } catch (error) {
    return { status: "failed", detail: `Resend indisponível: ${(error as Error).message}` };
  }
}

/* ─────────────────────────── WhatsApp ─────────────────────────── */

async function sendCallMeBot(to: string, text: string): Promise<ChannelResult> {
  const apiKey = env("CALLMEBOT_API_KEY");
  if (!apiKey) return { status: "skipped", detail: "CALLMEBOT_API_KEY não configurada" };
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", `+${to}`);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await response.text();
  // A CallMeBot responde 200 mesmo em alguns erros; o texto confirma o envio.
  if (response.ok && /queued|sent|enviad/i.test(body)) return { status: "sent" };
  return { status: "failed", detail: `CallMeBot ${response.status}: ${body.replace(/<[^>]+>/g, " ").trim().slice(0, 200)}` };
}

async function sendMetaCloud(to: string, text: string, lead: any, adminUrl?: string): Promise<ChannelResult> {
  const token = env("META_WA_TOKEN");
  const phoneNumberId = env("META_WA_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) return { status: "skipped", detail: "META_WA_TOKEN / META_WA_PHONE_NUMBER_ID não configurados" };

  const template = env("META_WA_TEMPLATE");
  const rooms = (lead.rooms ?? []).map((id: string) => getRoom(id)?.shortTitle ?? id).join(", ") || "—";
  // Fora da janela de 24 h a Meta só aceita templates aprovados.
  const payload = template
    ? {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: env("META_WA_TEMPLATE_LANG") || "pt_BR" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: lead.name },
              { type: "text", text: formatPhoneDisplay(lead.whatsapp) },
              { type: "text", text: rooms },
              { type: "text", text: adminUrl ?? "painel do site" },
            ],
          },
        ],
      },
    }
    : { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: text } };

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { status: "failed", detail: `Meta ${response.status}: ${body?.error?.message ?? "erro"}` };
  return { status: "sent", id: body?.messages?.[0]?.id };
}

async function sendTwilio(to: string, text: string): Promise<ChannelResult> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_WHATSAPP_FROM");
  if (!sid || !authToken || !from) return { status: "skipped", detail: "Credenciais Twilio não configuradas" };

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:+${to}`, Body: text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { status: "failed", detail: `Twilio ${response.status}: ${body?.message ?? "erro"}` };
  return { status: "sent", id: body?.sid };
}

export function whatsappProvider(): string {
  return (env("WHATSAPP_PROVIDER") || "callmebot").toLowerCase();
}

export async function sendWhatsApp(input: { to: string; text: string; lead: any; adminUrl?: string }): Promise<ChannelResult> {
  const provider = whatsappProvider();
  try {
    if (provider === "callmebot") return await sendCallMeBot(input.to, input.text);
    if (provider === "meta") return await sendMetaCloud(input.to, input.text, input.lead, input.adminUrl);
    if (provider === "twilio") return await sendTwilio(input.to, input.text);
    if (provider === "none") return { status: "disabled", detail: "WHATSAPP_PROVIDER=none" };
    return { status: "skipped", detail: `Provedor desconhecido: ${provider}` };
  } catch (error) {
    return { status: "failed", detail: `${provider} indisponível: ${(error as Error).message}` };
  }
}

/* ─────────────────────────── orquestração ─────────────────────────── */

export async function notifyLead(supabase: any, lead: any): Promise<NotificationRecord> {
  const [config, studioName, attachmentLinks] = await Promise.all([
    loadNotificationConfig(supabase),
    loadStudioName(supabase),
    signAttachments(supabase, lead),
  ]);

  const siteUrl = env("SITE_URL").replace(/\/+$/, "");
  const adminUrl = siteUrl ? `${siteUrl}/admin/leads?lead=${lead.id}` : undefined;

  const emailTask: Promise<ChannelResult> = !config.emailEnabled
    ? Promise.resolve({ status: "disabled" })
    : config.emailTo.length === 0
    ? Promise.resolve({ status: "skipped", detail: "Nenhum e-mail de destino (painel ou NOTIFY_EMAIL_TO)" })
    : sendEmail({
      to: config.emailTo,
      subject: formatLeadSubject(lead),
      html: formatLeadHtml(lead, { adminUrl, attachmentLinks, studioName }),
      text: formatLeadText(lead, { adminUrl, attachmentLinks }),
      replyTo: lead.email,
    });

  // CallMeBot envia via URL (GET): mensagens menores evitam cortes.
  const maxLength = whatsappProvider() === "callmebot" ? 1500 : 3800;
  const whatsappTask: Promise<ChannelResult> = !config.whatsappEnabled
    ? Promise.resolve({ status: "disabled" })
    : !config.whatsappTo
    ? Promise.resolve({ status: "skipped", detail: "Nenhum WhatsApp de destino (painel ou NOTIFY_WHATSAPP_TO)" })
    : sendWhatsApp({
      to: config.whatsappTo,
      text: formatLeadText(lead, { adminUrl, attachmentLinks, maxLength }),
      lead,
      adminUrl,
    });

  const [email, whatsapp] = await Promise.all([emailTask, whatsappTask]);
  const record: NotificationRecord = { at: new Date().toISOString(), email, whatsapp };
  const anySent = email.status === "sent" || whatsapp.status === "sent";

  const { error } = await supabase
    .from("leads")
    .update({ notification: record, ...(anySent ? { notified_at: record.at } : {}) })
    .eq("id", lead.id);
  if (error) console.error("[notify] não foi possível salvar o resultado:", error.message);

  return record;
}
