/**
 * Variáveis de ambiente do SERVIDOR. Nunca importe este arquivo em código de navegador.
 *
 * O `.env` é carregado com `process.loadEnvFile` (Node ≥ 20.12), sem dependências.
 * Variáveis já definidas no ambiente (ex.: no provedor de hospedagem) têm prioridade.
 */
let loaded = false;

function loadDotEnvOnce() {
  if (loaded) return;
  loaded = true;
  try {
    process.loadEnvFile?.();
  } catch {
    // Sem arquivo .env: tudo bem, seguimos com o ambiente do processo.
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Lido a cada chamada (barato) para que testes possam alterar process.env. */
export function getServerEnv() {
  loadDotEnvOnce();
  const env = process.env;
  const isProduction = env.NODE_ENV === "production";
  const forceDemo = ["1", "true", "yes"].includes(clean(env.FORCE_DEMO_MODE).toLowerCase());

  const supabaseUrl = forceDemo ? "" : clean(env.SUPABASE_URL).replace(/\/+$/, "");
  const supabaseAnonKey = forceDemo ? "" : clean(env.SUPABASE_ANON_KEY);
  const isSupabaseConfigured = Boolean(
    supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("SEU-PROJETO"),
  );

  return {
    isProduction,
    siteUrl: (clean(env.SITE_URL) || "http://localhost:5173").replace(/\/+$/, ""),
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured,
    sessionSecret: clean(env.SESSION_SECRET) || "somente-para-desenvolvimento-troque-em-producao",
    demoAdminEmail: (clean(env.DEMO_ADMIN_EMAIL) || "admin@demo.local").toLowerCase(),
    // Em produção o login demo só existe se a senha for definida explicitamente.
    demoAdminPassword: clean(env.DEMO_ADMIN_PASSWORD) || (isProduction ? "" : "demo1234"),
  };
}

/** Subconjunto seguro para o navegador (injetado em window.__ENV pelo root). */
export function getPublicEnv() {
  const env = getServerEnv();
  return {
    SUPABASE_URL: env.isSupabaseConfigured ? env.supabaseUrl : "",
    SUPABASE_ANON_KEY: env.isSupabaseConfigured ? env.supabaseAnonKey : "",
    SITE_URL: env.siteUrl,
    DEMO_MODE: !env.isSupabaseConfigured,
  };
}
