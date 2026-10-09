/**
 * Edge Function: notify-lead
 * (Re)envia a notificação de um lead por e-mail e WhatsApp.
 * Chamada pelo painel ("Reenviar notificação") ou por um Database Webhook.
 * Lógica em ../_shared/notify-lead.handler.ts (testada em tests/functions).
 *
 * Deploy:  npx supabase functions deploy notify-lead --no-verify-jwt --use-api
 */
import { notifyLeadHandler } from "../_shared/notify-lead.handler.ts";
import { createServiceClient } from "../_shared/supabase-admin.ts";

const handler = notifyLeadHandler({ supabase: createServiceClient() });

Deno.serve(handler);
