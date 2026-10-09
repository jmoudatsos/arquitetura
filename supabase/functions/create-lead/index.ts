/**
 * Edge Function: create-lead
 * Recebe o briefing do site, valida, grava em `public.leads` e notifica a equipe.
 * Lógica em ../_shared/create-lead.handler.ts (testada em tests/functions).
 *
 * Deploy:  npx supabase functions deploy create-lead --no-verify-jwt --use-api
 */
import { createLeadHandler } from "../_shared/create-lead.handler.ts";
import { createServiceClient } from "../_shared/supabase-admin.ts";

const handler = createLeadHandler({ supabase: createServiceClient() });

Deno.serve(handler);
