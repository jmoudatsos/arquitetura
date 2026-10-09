/**
 * Lógica da Edge Function `create-lead` (separada do Deno.serve para ser testável).
 *
 *  1. CORS / método
 *  2. honeypot anti-spam
 *  3. validação com o MESMO esquema zod do site (lead.schema.js)
 *  4. limites: por IP, por WhatsApp e global por hora
 *  5. confere se os anexos foram mesmo enviados ao Storage
 *  6. grava o lead (service role) e dispara as notificações
 */
// deno-lint-ignore-file no-explicit-any
import { briefingSchema } from "./lead.schema.js";
import { briefingToLeadRow } from "./lead.mapper.js";
import { clientIp, envInt, json, preflight, sha256Hex } from "./http.ts";
import { notifyLead as defaultNotify } from "./notifications.ts";

export type CreateLeadDeps = {
  supabase: any;
  notify?: (supabase: any, lead: any) => Promise<unknown>;
  now?: () => Date;
};

async function verifyAttachments(supabase: any, submissionId: string, attachments: any[]) {
  if (!attachments.length) return [];
  const { data, error } = await supabase.storage.from("briefing-uploads").list(submissionId, { limit: 100 });
  if (error) {
    console.warn("[create-lead] não foi possível listar anexos:", error.message);
    return [];
  }
  const uploaded = new Set((data ?? []).map((object: any) => `${submissionId}/${object.name}`));
  return attachments.filter((file) => uploaded.has(file.path));
}

async function countSince(supabase: any, column: string | null, value: string | null, sinceIso: string) {
  let query = supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", sinceIso);
  if (column) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw new Error(`rate-limit: ${error.message}`);
  return count ?? 0;
}

export function createLeadHandler(deps: CreateLeadDeps) {
  const notify = deps.notify ?? defaultNotify;
  const now = deps.now ?? (() => new Date());

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return preflight(req);
    if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "invalid_json" }, 400);
    }

    // Honeypot preenchido: finge sucesso para não ensinar o robô.
    if (typeof body?.website === "string" && body.website.trim() !== "") {
      return json(req, { ok: true, lead_id: null }, 200);
    }

    const parsed = briefingSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        req,
        {
          error: "validation_failed",
          issues: parsed.error.issues.map((issue: any) => ({ path: issue.path.join("."), message: issue.message })),
        },
        422,
      );
    }
    const briefing = parsed.data;
    const supabase = deps.supabase;

    // ── limites anti-abuso ──
    const ip = clientIp(req);
    const ipHash = ip ? await sha256Hex(`${ip}:${Deno.env.get("IP_HASH_SALT") ?? "briefing"}`) : null;
    const row = briefingToLeadRow(briefing, { now: now() });
    const tenMinutesAgo = new Date(now().getTime() - 10 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now().getTime() - 60 * 60 * 1000).toISOString();

    try {
      const [byIp, byPhone, global] = await Promise.all([
        ipHash ? countSince(supabase, "ip_hash", ipHash, tenMinutesAgo) : Promise.resolve(0),
        countSince(supabase, "whatsapp", row.whatsapp, oneHourAgo),
        countSince(supabase, null, null, oneHourAgo),
      ]);
      if (byIp >= envInt("MAX_LEADS_PER_IP_10MIN", 5) || byPhone >= envInt("MAX_LEADS_PER_PHONE_HOUR", 3)) {
        return json(req, { error: "rate_limited" }, 429);
      }
      if (global >= envInt("MAX_LEADS_PER_HOUR", 100)) {
        return json(req, { error: "rate_limited_global" }, 429);
      }
    } catch (error) {
      console.error("[create-lead]", (error as Error).message);
      return json(req, { error: "db_error" }, 500);
    }

    const attachments = await verifyAttachments(supabase, briefing.submissionId, row.attachments);

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        ...row,
        attachments,
        ip_hash: ipHash,
        user_agent: (req.headers.get("x-client-user-agent") || req.headers.get("user-agent") || "").slice(0, 300) || null,
      })
      .select("*")
      .single();

    if (error || !lead) {
      console.error("[create-lead] erro ao gravar:", error?.message);
      return json(req, { error: "db_error" }, 500);
    }

    // Notificação inline (padrão). Com NOTIFY_ON_CREATE=false, use um Database Webhook → notify-lead.
    let notification: any = null;
    if ((Deno.env.get("NOTIFY_ON_CREATE") ?? "true").toLowerCase() !== "false") {
      try {
        notification = await notify(supabase, lead);
      } catch (notifyError) {
        console.error("[create-lead] falha nas notificações:", (notifyError as Error).message);
        notification = { error: "notify_failed" };
      }
    }

    return json(
      req,
      {
        ok: true,
        lead_id: lead.id,
        notification: notification && {
          email: notification.email?.status ?? null,
          whatsapp: notification.whatsapp?.status ?? null,
        },
      },
      201,
    );
  };
}
