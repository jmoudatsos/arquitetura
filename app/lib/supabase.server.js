/**
 * Cliente Supabase para o SERVIDOR (loaders/actions).
 *
 * Usa a chave pública + os cookies da requisição, então tudo respeita o RLS:
 * visitante anônimo só lê o que é público; o admin logado lê/escreve via
 * política `is_admin()`. Nenhuma chave secreta (service role) passa por aqui —
 * operações privilegiadas acontecem nas Edge Functions.
 *
 * Sem Supabase configurado, `getDb` devolve o banco de demonstração em memória.
 */
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { getDemoDb } from "./demo-db.server.js";
import { getServerEnv } from "./env.server.js";

/**
 * @param {Request} request
 * @returns {{ supabase: import("@supabase/supabase-js").SupabaseClient, headers: Headers } | null}
 */
export function createSupabaseServerClient(request) {
  const env = getServerEnv();
  if (!env.isSupabaseConfigured) return null;

  const headers = new Headers();
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet, cacheHeaders) {
        for (const { name, value, options } of cookiesToSet) {
          headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
        }
        // Respostas que gravam cookie de sessão não podem ser cacheadas por CDN.
        for (const [key, value] of Object.entries(cacheHeaders ?? {})) headers.set(key, value);
      },
    },
  });

  return { supabase, headers };
}

/**
 * Banco a ser usado pela requisição.
 * @returns {{ db: any, headers: Headers, demo: boolean }}
 */
export function getDb(request) {
  const client = createSupabaseServerClient(request);
  if (client) return { db: client.supabase, headers: client.headers, demo: false };
  return { db: getDemoDb(), headers: new Headers(), demo: true };
}
