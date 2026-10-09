/**
 * Cliente Supabase para o NAVEGADOR.
 *
 * As credenciais públicas chegam em `window.__ENV` (injetado pelo root.jsx a
 * partir do servidor), então o mesmo build funciona em qualquer ambiente.
 * Usado para enviar os anexos do briefing direto ao Storage, sem passar
 * arquivos de até 25 MB pelo servidor do site.
 */
import { createBrowserClient } from "@supabase/ssr";

let client = null;

export function getPublicEnvFromWindow() {
  if (typeof window === "undefined") return {};
  return window.__ENV ?? {};
}

/** @returns {import("@supabase/supabase-js").SupabaseClient | null} */
export function getBrowserSupabase() {
  if (typeof window === "undefined") return null;
  const env = getPublicEnvFromWindow();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  client ??= createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  return client;
}
