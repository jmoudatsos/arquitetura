/**
 * Lógica da Edge Function `notify-lead`: (re)envia a notificação de um lead.
 *
 * Quem pode chamar:
 *   • o painel admin (Authorization: Bearer <JWT de um usuário em admin_users>);
 *   • um Database Webhook / automação com o cabeçalho `x-notify-secret: NOTIFY_SECRET`.
 *
 * Corpo aceito:
 *   { "lead_id": "<uuid>" }                         ← painel / chamadas manuais
 *   { "type": "INSERT", "record": { "id": … } }     ← Database Webhook do Supabase
 */
// deno-lint-ignore-file no-explicit-any
import { json, preflight } from "./http.ts";
import { notifyLead as defaultNotify } from "./notifications.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NotifyLeadDeps = {
  supabase: any;
  notify?: (supabase: any, lead: any) => Promise<unknown>;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isAuthorized(req: Request, supabase: any): Promise<boolean> {
  const secret = Deno.env.get("NOTIFY_SECRET") ?? "";
  const provided = req.headers.get("x-notify-secret") ?? "";
  if (secret && provided && timingSafeEqual(provided, secret)) return true;

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return false;
  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return Boolean(admin);
}

export function notifyLeadHandler(deps: NotifyLeadDeps) {
  const notify = deps.notify ?? defaultNotify;

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return preflight(req);
    if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

    const supabase = deps.supabase;
    if (!(await isAuthorized(req, supabase))) return json(req, { error: "unauthorized" }, 401);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "invalid_json" }, 400);
    }

    const leadId = body?.lead_id ?? body?.record?.id;
    if (!UUID_RE.test(String(leadId ?? ""))) return json(req, { error: "lead_id inválido" }, 400);

    const { data: lead, error } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
    if (error) return json(req, { error: "db_error" }, 500);
    if (!lead) return json(req, { error: "lead não encontrado" }, 404);

    const results = await notify(supabase, lead);
    return json(req, { ok: true, results }, 200);
  };
}
