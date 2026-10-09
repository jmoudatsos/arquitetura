/**
 * Leads (briefings recebidos).
 *
 * Envio público:
 *   Supabase configurado → Edge Function `create-lead` (valida, grava com
 *   service role, aplica rate-limit e dispara `notify` por e-mail/WhatsApp).
 *   Modo demo            → grava no banco em memória e gera a prévia da mensagem.
 *
 * Admin: leituras/escritas com o cliente do usuário logado (RLS is_admin()).
 */
import { getServerEnv } from "../../lib/env.server.js";
import { sanitizeSearch } from "../../utils/form-data.js";
import { LEAD_STATUS_IDS } from "./briefing.options.js";
import { formatLeadText } from "./lead.format.js";
import { briefingToLeadRow } from "./lead.mapper.js";

export const BRIEFING_BUCKET = "briefing-uploads";

function unwrap({ data, error }, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}

/** IP do visitante, respeitando proxies comuns (Vercel, Cloudflare, Nginx). */
export function clientIp(request) {
  const headers = request.headers;
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  return candidates.find((value) => value && value.trim())?.trim() ?? "";
}

/* ─────────────────────────── Envio do briefing ─────────────────────────── */

function issuesListToFieldErrors(issues) {
  const out = {};
  for (const issue of issues ?? []) {
    const key = issue.path || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

async function submitToEdgeFunction(briefing, request) {
  const env = getServerEnv();
  let response;
  try {
    response = await fetch(`${env.supabaseUrl}/functions/v1/create-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        "x-client-ip": clientIp(request),
        "x-client-user-agent": request.headers.get("user-agent")?.slice(0, 300) ?? "",
      },
      body: JSON.stringify(briefing),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    console.error("[leads] create-lead indisponível:", error);
    return {
      ok: false,
      status: 503,
      message: "Não conseguimos enviar agora. Tente de novo em instantes ou fale conosco pelo WhatsApp.",
    };
  }

  const body = await response.json().catch(() => ({}));
  if (response.status === 422) {
    return { ok: false, status: 422, fieldErrors: issuesListToFieldErrors(body.issues), message: "Revise os campos destacados." };
  }
  if (response.status === 429) {
    return {
      ok: false,
      status: 429,
      message: "Recebemos vários envios seguidos deste endereço. Aguarde alguns minutos ou fale conosco pelo WhatsApp.",
    };
  }
  if (!response.ok) {
    console.error("[leads] create-lead respondeu", response.status, body);
    return {
      ok: false,
      status: response.status,
      message: "Não foi possível registrar seu briefing agora. Tente novamente ou fale conosco pelo WhatsApp.",
    };
  }
  return { ok: true, leadId: body.lead_id ?? null, notification: body.notification ?? null, demo: false };
}

async function submitToDemo(briefing, request, db) {
  const row = briefingToLeadRow(briefing);
  const draft = { ...row, id: "demo", created_at: new Date().toISOString() };
  const preview = formatLeadText(draft, { heading: "Novo briefing recebido (modo demonstração)" });

  const { data, error } = await db
    .from("leads")
    .insert({
      ...row,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      ip_hash: "demo",
      notification: {
        mode: "demo",
        at: new Date().toISOString(),
        email: { status: "skipped", detail: "Modo demonstração: configure o Supabase + Resend" },
        whatsapp: { status: "skipped", detail: "Modo demonstração: configure o Supabase + provedor de WhatsApp" },
        preview,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[leads] erro no modo demo:", error);
    return { ok: false, status: 500, message: "Erro ao registrar o briefing (modo demonstração)." };
  }
  console.info(`\n[leads] Novo briefing (modo demonstração) — ${data.id}\n${preview}\n`);
  return { ok: true, leadId: data.id, notification: null, demo: true };
}

/**
 * @param {object} briefing  dados já validados por `briefingSchema`
 * @param {{ request: Request, db: any, demo: boolean }} ctx
 */
export async function submitBriefing(briefing, { request, db, demo }) {
  return demo ? submitToDemo(briefing, request, db) : submitToEdgeFunction(briefing, request);
}

/* ─────────────────────────── Admin ─────────────────────────── */

export async function listLeads(db, { status, q, limit = 200 } = {}) {
  let query = db.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);
  if (status && LEAD_STATUS_IDS.includes(status)) query = query.eq("status", status);

  const term = sanitizeSearch(q);
  if (term) {
    const digits = term.replace(/\D/g, "");
    const clauses = [`name.ilike.*${term}*`, `city.ilike.*${term}*`, `email.ilike.*${term}*`];
    if (digits.length >= 4) clauses.push(`whatsapp.ilike.*${digits}*`);
    query = query.or(clauses.join(","));
  }
  return unwrap(await query, "Erro ao listar leads");
}

export async function getLead(db, id) {
  return unwrap(await db.from("leads").select("*").eq("id", id).maybeSingle(), "Erro ao carregar o lead");
}

/** Contagem por status (volume de um estúdio cabe tranquilamente em memória). */
export async function countLeadsByStatus(db) {
  const rows = unwrap(await db.from("leads").select("status, created_at").limit(5000), "Erro ao contar leads");
  const counts = Object.fromEntries(LEAD_STATUS_IDS.map((id) => [id, 0]));
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let last30 = 0;
  for (const row of rows) {
    if (row.status in counts) counts[row.status] += 1;
    if (new Date(row.created_at).getTime() >= since) last30 += 1;
  }
  return { byStatus: counts, total: rows.length, last30 };
}

export async function updateLeadStatus(db, id, status) {
  if (!LEAD_STATUS_IDS.includes(status)) return { error: { message: "Status inválido" } };
  return db.from("leads").update({ status }).eq("id", id);
}

export async function updateLeadNotes(db, id, internalNotes) {
  return db
    .from("leads")
    .update({ internal_notes: String(internalNotes ?? "").slice(0, 4000) || null })
    .eq("id", id);
}

export async function deleteLead(db, id) {
  const lead = await getLead(db, id);
  if (!lead) return { error: { message: "Lead não encontrado" } };
  const paths = (lead.attachments ?? []).map((file) => file.path).filter(Boolean);
  if (paths.length) {
    const removal = await db.storage.from(BRIEFING_BUCKET).remove(paths);
    if (removal.error) console.warn("[leads] não foi possível remover anexos:", removal.error.message);
  }
  return db.from("leads").delete().eq("id", id);
}

/** path → URL assinada (1 h) para baixar os anexos no painel. */
export async function signAttachmentLinks(db, lead, expiresIn = 3600) {
  const paths = (lead?.attachments ?? []).map((file) => file.path).filter(Boolean);
  if (!paths.length) return {};
  const { data, error } = await db.storage.from(BRIEFING_BUCKET).createSignedUrls(paths, expiresIn);
  if (error) {
    console.warn("[leads] erro ao assinar anexos:", error.message);
    return {};
  }
  return Object.fromEntries((data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
}

/** Reenvia a notificação (botão no painel). Usa o token do admin logado. */
export async function resendLeadNotification(db, id, { demo }) {
  if (demo) {
    const lead = await getLead(db, id);
    if (!lead) return { ok: false, message: "Lead não encontrado" };
    const preview = formatLeadText(lead, { heading: "Novo briefing recebido (modo demonstração)" });
    await db
      .from("leads")
      .update({
        notification: {
          ...(lead.notification ?? {}),
          mode: "demo",
          at: new Date().toISOString(),
          preview,
        },
      })
      .eq("id", id);
    return { ok: true, message: "Modo demonstração: nada foi enviado, a prévia foi atualizada." };
  }

  const { data, error } = await db.functions.invoke("notify-lead", { body: { lead_id: id } });
  if (error) {
    let detail = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) detail = body.error;
    } catch {
      /* resposta sem JSON */
    }
    return { ok: false, message: `Falha ao reenviar: ${detail}` };
  }
  const email = data?.results?.email?.status ?? "—";
  const whatsapp = data?.results?.whatsapp?.status ?? "—";
  return { ok: true, message: `Notificação processada · e-mail: ${email} · WhatsApp: ${whatsapp}` };
}
