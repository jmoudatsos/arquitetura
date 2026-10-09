/**
 * Autenticação do painel admin.
 *
 *  • Supabase configurado: Supabase Auth (e-mail + senha) com sessão em cookie
 *    (@supabase/ssr). Só entra quem também está na tabela `admin_users`.
 *  • Modo demonstração: login fixo via variáveis DEMO_ADMIN_* e cookie assinado.
 *
 * IMPORTANTE: no React Router os loaders filhos rodam em paralelo ao do layout,
 * então TODA rota admin chama `requireAdmin` no próprio loader/action.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { createCookieSessionStorage, redirect } from "react-router";
import { getDemoDb } from "../../lib/demo-db.server.js";
import { getServerEnv } from "../../lib/env.server.js";
import { createSupabaseServerClient } from "../../lib/supabase.server.js";

let demoStorage = null;
let demoStorageSecret = null;

function getDemoSessionStorage() {
  const env = getServerEnv();
  if (!demoStorage || demoStorageSecret !== env.sessionSecret) {
    demoStorageSecret = env.sessionSecret;
    demoStorage = createCookieSessionStorage({
      cookie: {
        name: "__studio_admin_demo",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.isProduction,
        secrets: [env.sessionSecret],
        maxAge: 60 * 60 * 8,
      },
    });
  }
  return demoStorage;
}

function safeEqual(a, b) {
  const hash = (value) => createHash("sha256").update(String(value)).digest();
  return timingSafeEqual(hash(a), hash(b));
}

function loginUrl(request, reason) {
  const url = new URL(request.url);
  const params = new URLSearchParams({ next: `${url.pathname}${url.search}` });
  if (reason) params.set("motivo", reason);
  return `/admin/login?${params}`;
}

/**
 * Contexto do admin logado ou null.
 * @returns {Promise<{ user: { id: string, email: string }, db: any, headers: Headers, demo: boolean } | null>}
 */
export async function getAdminContext(request) {
  const client = createSupabaseServerClient(request);

  if (!client) {
    const storage = getDemoSessionStorage();
    const session = await storage.getSession(request.headers.get("Cookie"));
    const email = session.get("adminEmail");
    if (!email) return null;
    return { user: { id: "demo-admin", email }, db: getDemoDb(), headers: new Headers(), demo: true };
  }

  const { supabase, headers } = client;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { user: null, db: supabase, headers, demo: false };

  const { data: membership } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!membership) return { user: null, db: supabase, headers, demo: false, forbidden: true };
  return { user: { id: data.user.id, email: data.user.email, role: membership.role }, db: supabase, headers, demo: false };
}

/** Garante admin logado; senão redireciona para o login (preservando o destino). */
export async function requireAdmin(request) {
  const context = await getAdminContext(request);
  if (context?.user) return context;
  throw redirect(loginUrl(request, context?.forbidden ? "sem-acesso" : undefined), {
    headers: context?.headers,
  });
}

/** @returns {Promise<{ ok: true, headers: Headers } | { ok: false, error: string, headers?: Headers }>} */
export async function signInAdmin(request, { email, password }) {
  const client = createSupabaseServerClient(request);

  if (!client) {
    const env = getServerEnv();
    if (!env.demoAdminPassword) {
      return { ok: false, error: "Login de demonstração desativado em produção. Configure o Supabase ou DEMO_ADMIN_PASSWORD." };
    }
    // As duas comparações sempre rodam (tempo constante, não revela qual campo errou).
    const emailOk = safeEqual(email, env.demoAdminEmail);
    const passwordOk = safeEqual(password, env.demoAdminPassword);
    if (!(emailOk && passwordOk)) return { ok: false, error: "E-mail ou senha incorretos." };

    const storage = getDemoSessionStorage();
    const session = await storage.getSession(request.headers.get("Cookie"));
    session.set("adminEmail", email);
    const headers = new Headers({ "Set-Cookie": await storage.commitSession(session) });
    return { ok: true, headers };
  }

  const { supabase, headers } = client;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    const tooMany = error?.status === 429;
    return {
      ok: false,
      headers,
      error: tooMany ? "Muitas tentativas. Aguarde alguns minutos." : "E-mail ou senha incorretos.",
    };
  }

  const { data: membership } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!membership) {
    await supabase.auth.signOut();
    return { ok: false, headers, error: "Este usuário não tem acesso ao painel." };
  }
  return { ok: true, headers };
}

export async function signOutAdmin(request) {
  const client = createSupabaseServerClient(request);
  if (!client) {
    const storage = getDemoSessionStorage();
    const session = await storage.getSession(request.headers.get("Cookie"));
    return new Headers({ "Set-Cookie": await storage.destroySession(session) });
  }
  await client.supabase.auth.signOut();
  return client.headers;
}
