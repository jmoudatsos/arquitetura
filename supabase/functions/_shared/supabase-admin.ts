/**
 * Cliente Supabase com a chave de serviço (ignora RLS). SÓ dentro das Edge Functions.
 * SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo Supabase.
 */
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente da função");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
