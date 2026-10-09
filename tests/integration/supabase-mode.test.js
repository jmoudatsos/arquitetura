// @vitest-environment node
/**
 * Modo Supabase de verdade (supabase-js + @supabase/ssr reais), com a rede
 * simulada: confere a fiação que não dá para exercitar no modo demo —
 * login com cookie de sessão, checagem de admin_users, chamada à Edge
 * Function create-lead e tradução das respostas para o formulário.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminContext, requireAdmin, signInAdmin } from "../../app/features/auth/auth.server.js";
import { submitBriefing } from "../../app/features/leads/lead.service.js";
import { briefingSchema } from "../../app/features/leads/lead.schema.js";
import { getDb } from "../../app/lib/supabase.server.js";
import { minimalBriefing } from "../fixtures/briefing.js";

const SUPABASE_URL = "https://abcdefghijklmnop.supabase.co";
const ADMIN_ID = "11111111-1111-4111-8111-111111111111";

function fakeJwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.assinatura`;
}

const now = Math.floor(Date.now() / 1000);
const user = { id: ADMIN_ID, aud: "authenticated", role: "authenticated", email: "dono@estudio.com" };
const session = {
  access_token: fakeJwt({ sub: ADMIN_ID, exp: now + 3600, role: "authenticated", aud: "authenticated" }),
  refresh_token: "refresh-123",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: now + 3600,
  user,
};

let calls;
let adminRows;
let edgeResponse;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  calls = [];
  adminRows = [{ user_id: ADMIN_ID, role: "owner" }];
  edgeResponse = () => json({ ok: true, lead_id: "22222222-2222-4222-8222-222222222222", notification: { email: "sent" } }, 201);
  vi.stubEnv("FORCE_DEMO_MODE", "");
  vi.stubEnv("SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("SUPABASE_ANON_KEY", "chave-publica-anon");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input, init = {}) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      const method = init.method ?? (typeof input === "string" ? "GET" : input.method) ?? "GET";
      const headers = new Headers(init.headers ?? (typeof input === "string" ? {} : input.headers));
      const body = init.body ?? null;
      calls.push({ url, method, headers, body });

      if (url.pathname === "/auth/v1/token") {
        const { password } = JSON.parse(body);
        return password === "certa" ? json(session) : json({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
      }
      if (url.pathname === "/auth/v1/user") {
        return headers.get("authorization") === `Bearer ${session.access_token}` ? json(user) : json({ message: "invalid JWT" }, 401);
      }
      if (url.pathname === "/auth/v1/logout") return new Response(null, { status: 204 });
      if (url.pathname === "/rest/v1/admin_users") {
        const wantsObject = (headers.get("accept") ?? "").includes("vnd.pgrst.object");
        return wantsObject ? json(adminRows[0] ?? null) : json(adminRows);
      }
      if (url.pathname === "/functions/v1/create-lead") return edgeResponse();
      return json({ message: `rota não simulada: ${url.pathname}` }, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function cookieHeaderFrom(headers) {
  return headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .filter((pair) => !pair.endsWith("="))
    .join("; ");
}

describe("modo Supabase", () => {
  it("getDb usa o cliente Supabase (não o banco demo)", () => {
    const { db, demo } = getDb(new Request("http://site/"));
    expect(demo).toBe(false);
    expect(db.isDemo).toBeUndefined();
    expect(typeof db.auth.getUser).toBe("function");
  });

  it("login grava o cookie de sessão; com ele o painel reconhece o admin", async () => {
    const wrong = await signInAdmin(new Request("http://site/admin/login", { method: "POST" }), {
      email: "dono@estudio.com",
      password: "errada",
    });
    expect(wrong).toMatchObject({ ok: false, error: "E-mail ou senha incorretos." });

    const result = await signInAdmin(new Request("http://site/admin/login", { method: "POST" }), {
      email: "dono@estudio.com",
      password: "certa",
    });
    expect(result.ok).toBe(true);
    const setCookies = result.headers.getSetCookie();
    expect(setCookies.some((cookie) => cookie.startsWith("sb-abcdefghijklmnop-auth-token"))).toBe(true);

    const cookie = cookieHeaderFrom(result.headers);
    const context = await requireAdmin(new Request("http://site/admin", { headers: { Cookie: cookie } }));
    expect(context.user).toMatchObject({ id: ADMIN_ID, email: "dono@estudio.com", role: "owner" });
    expect(context.demo).toBe(false);

    // A consulta de admin_users foi feita com o token do usuário (RLS no banco).
    const adminQuery = calls.find((call) => call.url.pathname === "/rest/v1/admin_users");
    expect(adminQuery.headers.get("authorization")).toBe(`Bearer ${session.access_token}`);
  });

  it("usuário autenticado que NÃO está em admin_users é barrado", async () => {
    adminRows = [];
    const login = await signInAdmin(new Request("http://site/admin/login", { method: "POST" }), {
      email: "dono@estudio.com",
      password: "certa",
    });
    expect(login).toMatchObject({ ok: false, error: "Este usuário não tem acesso ao painel." });
    expect(calls.some((call) => call.url.pathname === "/auth/v1/logout")).toBe(true);
  });

  it("sem cookie: getAdminContext sem usuário e requireAdmin redireciona", async () => {
    const context = await getAdminContext(new Request("http://site/admin"));
    expect(context.user).toBeNull();
    await expect(requireAdmin(new Request("http://site/admin/leads"))).rejects.toMatchObject({ status: 302 });
  });

  it("briefing vai para a Edge Function com IP real, user-agent e chave pública", async () => {
    const briefing = briefingSchema.parse(minimalBriefing());
    const request = new Request("http://site/briefing", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1", "user-agent": "Safari/17" },
    });
    const result = await submitBriefing(briefing, { request, db: null, demo: false });
    expect(result).toEqual({
      ok: true,
      leadId: "22222222-2222-4222-8222-222222222222",
      notification: { email: "sent" },
      demo: false,
    });

    const call = calls.find((c) => c.url.pathname === "/functions/v1/create-lead");
    expect(call.method).toBe("POST");
    expect(call.headers.get("apikey")).toBe("chave-publica-anon");
    expect(call.headers.get("x-client-ip")).toBe("203.0.113.9");
    expect(call.headers.get("x-client-user-agent")).toBe("Safari/17");
    expect(JSON.parse(call.body)).toMatchObject({ nome: "Mariana Albuquerque", consentimento: true });
  });

  it("traduz 422 (campos), 429 (limite) e falhas de rede para o formulário", async () => {
    const briefing = briefingSchema.parse(minimalBriefing());
    const ctx = { request: new Request("http://site/briefing", { method: "POST" }), db: null, demo: false };

    edgeResponse = () => json({ error: "validation_failed", issues: [{ path: "whatsapp", message: "Número inválido" }] }, 422);
    expect(await submitBriefing(briefing, ctx)).toMatchObject({ ok: false, status: 422, fieldErrors: { whatsapp: "Número inválido" } });

    edgeResponse = () => json({ error: "rate_limited" }, 429);
    expect(await submitBriefing(briefing, ctx)).toMatchObject({ ok: false, status: 429, message: expect.stringMatching(/Aguarde/) });

    vi.spyOn(console, "error").mockImplementation(() => {});
    edgeResponse = () => {
      throw new TypeError("fetch failed");
    };
    expect(await submitBriefing(briefing, ctx)).toMatchObject({ ok: false, status: 503 });
  });
});
