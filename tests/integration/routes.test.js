// @vitest-environment node
/**
 * Loaders e actions reais das rotas, rodando no modo demonstração
 * (mesmos services e validações usados com o Supabase).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDemoDb } from "../../app/lib/demo-db.server.js";
import * as root from "../../app/root.jsx";
import * as adminLeads from "../../app/routes/admin-leads.jsx";
import * as adminLogin from "../../app/routes/admin-login.jsx";
import * as adminMedia from "../../app/routes/admin-media.jsx";
import * as adminProjectNew from "../../app/routes/admin-project-new.jsx";
import * as adminProjects from "../../app/routes/admin-projects.jsx";
import * as adminSettings from "../../app/routes/admin-settings.jsx";
import * as contact from "../../app/routes/contact.jsx";
import * as home from "../../app/routes/home.jsx";
import * as projectDetail from "../../app/routes/project-detail.jsx";
import * as projects from "../../app/routes/projects.jsx";
import { maximalBriefing, minimalBriefing } from "../fixtures/briefing.js";

const BASE = "http://localhost";
const ENV_KEYS = ["FORCE_DEMO_MODE", "SESSION_SECRET", "DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD", "NODE_ENV"];
let savedEnv;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    FORCE_DEMO_MODE: "1",
    SESSION_SECRET: "segredo-de-teste",
    DEMO_ADMIN_EMAIL: "admin@demo.local",
    DEMO_ADMIN_PASSWORD: "senha-teste",
    NODE_ENV: "test",
  });
  resetDemoDb();
  vi.spyOn(console, "info").mockImplementation(() => {}); // prévia do lead no modo demo
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** data(...) do React Router → { body, status, headers } */
function unwrap(result) {
  if (result instanceof Response) return { body: null, status: result.status, headers: result.headers, response: result };
  if (result?.type === "DataWithResponseInit") {
    return { body: result.data, status: result.init?.status ?? 200, headers: new Headers(result.init?.headers) };
  }
  return { body: result, status: 200, headers: new Headers() };
}

async function run(fn, args) {
  try {
    return unwrap(await fn(args));
  } catch (thrown) {
    return { ...unwrap(thrown), thrown: true };
  }
}

const get = (path, headers = {}) => new Request(`${BASE}${path}`, { headers });
const postJson = (path, body, headers = {}) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const postForm = (path, fields, headers = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((item) => form.append(key, item));
    else form.set(key, value);
  }
  return new Request(`${BASE}${path}`, { method: "POST", headers, body: form });
};

async function loginCookie() {
  const result = await run(adminLogin.action, {
    request: postForm("/admin/login", { email: "admin@demo.local", password: "senha-teste", next: "/admin/leads" }),
  });
  expect(result.status).toBe(302);
  expect(result.headers.get("Location")).toBe("/admin/leads");
  const setCookie = result.headers.get("Set-Cookie");
  expect(setCookie).toMatch(/__studio_admin_demo=/);
  expect(setCookie).toMatch(/HttpOnly/i);
  return setCookie.split(";")[0];
}

describe("páginas públicas", () => {
  it("root traz configurações e variáveis públicas (sem segredos)", async () => {
    const { body } = await run(root.loader, { request: get("/") });
    expect(body.settings.studio_name).toBe("W Studio");
    expect(body.env).toEqual({ SUPABASE_URL: "", SUPABASE_ANON_KEY: "", SITE_URL: expect.any(String), DEMO_MODE: true });
  });

  it("home: 4 projetos em destaque e serviços ativos", async () => {
    const { body } = await run(home.loader, { request: get("/") });
    expect(body.projects).toHaveLength(4);
    expect(body.projects.every((p) => p.cover_url?.startsWith("/images/"))).toBe(true);
    expect(body.services).toHaveLength(6);
  });

  it("projetos: filtro por categoria e contagem por categoria", async () => {
    const { body } = await run(projects.loader, { request: get("/projetos?categoria=cozinha") });
    expect(body.activeCategory).toBe("cozinha");
    expect(body.projects.map((p) => p.slug).sort()).toEqual(["cozinha-japandi", "cozinha-nogueira-e-pedra"]);
    expect(body.categories.find((c) => c.id === "cozinha").count).toBe(2);
    const invalid = await run(projects.loader, { request: get("/projetos?categoria=<script>") });
    expect(invalid.body.activeCategory).toBeNull();
  });

  it("detalhe: projeto com vizinhos; slug inexistente → 404", async () => {
    const ok = await run(projectDetail.loader, {
      request: get("/projetos/living-painel-ripado"),
      params: { slug: "living-painel-ripado" },
    });
    expect(ok.body.project.title).toBe("Living com Painel Ripado");
    expect(ok.body.previous.slug).toBe("cozinha-nogueira-e-pedra");
    expect(ok.body.next.slug).toBe("suite-marcenaria-integrada");

    const missing = await run(projectDetail.loader, { request: get("/projetos/nao-existe"), params: { slug: "nao-existe" } });
    expect(missing).toMatchObject({ thrown: true, status: 404 });
  });

  it("rascunho não aparece no site", async () => {
    const cookie = await loginCookie();
    await run(adminProjects.action, {
      request: postForm(
        "/admin/projetos",
        { intent: "unpublish", id: "5e3d0000-0000-4000-8000-000000000107" },
        { Cookie: cookie },
      ),
    });
    const list = await run(projects.loader, { request: get("/projetos") });
    expect(list.body.projects.map((p) => p.slug)).not.toContain("cozinha-japandi");
    const detail = await run(projectDetail.loader, { request: get("/projetos/cozinha-japandi"), params: { slug: "cozinha-japandi" } });
    expect(detail.status).toBe(404);
  });
});

describe("briefing (/briefing)", () => {
  it("loader lê ambientes/estilo e UTMs da URL", async () => {
    const { body } = await run(contact.loader, {
      request: get("/briefing?ambientes=cozinha,banheiro&estilo=organico&utm_source=instagram&utm_medium=bio"),
    });
    expect(body.prefill).toEqual({ ambientesSelecionados: ["cozinha", "banheiro"], estiloPrincipal: "organico" });
    expect(body.utm).toEqual({ utm_source: "instagram", utm_medium: "bio" });
  });

  it("envio válido grava o lead (201) e aparece no painel", async () => {
    const sent = await run(contact.action, {
      request: postJson("/briefing", maximalBriefing(), { "user-agent": "Vitest" }),
    });
    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({ ok: true, demo: true, leadId: expect.stringMatching(/^[0-9a-f-]{36}$/) });

    const cookie = await loginCookie();
    const panel = await run(adminLeads.loader, { request: get(`/admin/leads?lead=${sent.body.leadId}`, { Cookie: cookie }) });
    expect(panel.body.leads).toHaveLength(1);
    expect(panel.body.selected).toMatchObject({
      name: "Mariana Albuquerque",
      whatsapp: "5548999990000",
      email: "mariana@email.com",
      status: "novo",
      user_agent: "Vitest",
    });
    expect(panel.body.selected.notification.preview).toContain("*Novo briefing recebido (modo demonstração)*");
    expect(panel.body.stats.byStatus.novo).toBe(1);
  });

  it("envio inválido devolve erros por campo (400) e não grava", async () => {
    const sent = await run(contact.action, { request: postJson("/briefing", minimalBriefing({ nome: "", consentimento: false })) });
    expect(sent.status).toBe(400);
    expect(Object.keys(sent.body.fieldErrors)).toEqual(expect.arrayContaining(["nome", "consentimento"]));

    const cookie = await loginCookie();
    const panel = await run(adminLeads.loader, { request: get("/admin/leads", { Cookie: cookie }) });
    expect(panel.body.leads).toHaveLength(0);
  });

  it("honeypot: responde ok sem gravar; corpo não-JSON: 400", async () => {
    const bot = await run(contact.action, { request: postJson("/briefing", minimalBriefing({ website: "http://spam" })) });
    expect(bot.body).toEqual({ ok: true, leadId: null, demo: false });
    const broken = await run(contact.action, {
      request: new Request(`${BASE}/briefing`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" }),
    });
    expect(broken.status).toBe(400);

    const cookie = await loginCookie();
    const panel = await run(adminLeads.loader, { request: get("/admin/leads", { Cookie: cookie }) });
    expect(panel.body.leads).toHaveLength(0);
  });
});

describe("painel admin", () => {
  it("sem login → redireciona preservando o destino", async () => {
    const result = await run(adminLeads.loader, { request: get("/admin/leads?status=novo") });
    expect(result.thrown).toBe(true);
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/admin/login?next=%2Fadmin%2Fleads%3Fstatus%3Dnovo");
  });

  it("action do admin também exige login (não só o loader)", async () => {
    const result = await run(adminProjects.action, {
      request: postForm("/admin/projetos", { intent: "delete", id: "5e3d0000-0000-4000-8000-000000000101" }),
    });
    expect(result.status).toBe(302);
    const list = await run(projects.loader, { request: get("/projetos") });
    expect(list.body.projects).toHaveLength(7);
  });

  it("senha errada → 401; destino externo no ?next é ignorado", async () => {
    const wrong = await run(adminLogin.action, {
      request: postForm("/admin/login", { email: "admin@demo.local", password: "errada", next: "/admin" }),
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error).toBe("E-mail ou senha incorretos.");

    const evil = await run(adminLogin.action, {
      request: postForm("/admin/login", { email: "admin@demo.local", password: "senha-teste", next: "//evil.com" }),
    });
    expect(evil.headers.get("Location")).toBe("/admin");
  });

  it("em produção sem DEMO_ADMIN_PASSWORD o login demo fica desligado", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.DEMO_ADMIN_PASSWORD;
    const result = await run(adminLogin.action, {
      request: postForm("/admin/login", { email: "admin@demo.local", password: "demo1234", next: "/admin" }),
    });
    expect(result.status).toBe(401);
    expect(result.body.error).toMatch(/desativado em produção/);
  });

  it("cria projeto (validação + slug único) e ele aparece no site quando publicado", async () => {
    const cookie = await loginCookie();
    const base = {
      title: "Closet Nogueira",
      slug: "closet-nogueira",
      category: "quarto",
      status: "published",
      materials: "Nogueira\nLED",
      gallery: JSON.stringify([{ src: "/images/projects/suite-integrada-3.webp", alt: "Porta", caption: "" }]),
      year: "2026",
      area_m2: "12,5",
    };

    const invalid = await run(adminProjectNew.action, {
      request: postForm("/admin/projetos/novo", { ...base, slug: "Slug Inválido", year: "1800" }, { Cookie: cookie }),
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.errors).toMatchObject({ slug: expect.any(String), year: "Ano inválido" });

    const created = await run(adminProjectNew.action, { request: postForm("/admin/projetos/novo", base, { Cookie: cookie }) });
    expect(created.status).toBe(302);
    expect(created.headers.get("Location")).toMatch(/^\/admin\/projetos\/[0-9a-f-]{36}\?ok=criado$/);

    const duplicate = await run(adminProjectNew.action, { request: postForm("/admin/projetos/novo", base, { Cookie: cookie }) });
    expect(duplicate.body.errors.slug).toMatch(/Já existe/);

    const detail = await run(projectDetail.loader, { request: get("/projetos/closet-nogueira"), params: { slug: "closet-nogueira" } });
    expect(detail.body.project).toMatchObject({ area_m2: 12.5, year: 2026, materials: ["Nogueira", "LED"] });
    expect(detail.body.project.gallery[0].url).toBe("/images/projects/suite-integrada-3.webp");
  });

  it("configurações: valida e atualiza o nome do estúdio exibido no site", async () => {
    const cookie = await loginCookie();
    const invalid = await run(adminSettings.action, {
      request: postForm("/admin/configuracoes", { intent: "site", studio_name: "W", contact_whatsapp: "123" }, { Cookie: cookie }),
    });
    expect(invalid.status).toBe(400);
    expect(Object.keys(invalid.body.errors)).toEqual(expect.arrayContaining(["studio_name", "contact_whatsapp"]));

    const saved = await run(adminSettings.action, {
      request: postForm(
        "/admin/configuracoes",
        { intent: "site", studio_name: "Ateliê Serra", contact_whatsapp: "+55 (49) 99999-1234", instagram_url: "" },
        { Cookie: cookie },
      ),
    });
    expect(saved.body.ok).toBe(true);
    const { body } = await run(root.loader, { request: get("/") });
    expect(body.settings.studio_name).toBe("Ateliê Serra");
    expect(body.settings.contact_whatsapp).toBe("5549999991234");

    const notifications = await run(adminSettings.action, {
      request: postForm(
        "/admin/configuracoes",
        { intent: "notifications", email_enabled: "on", email_recipients: "a@b.com\nc@d.com", whatsapp_recipient: "" },
        { Cookie: cookie },
      ),
    });
    expect(notifications.body.ok).toBe(true);
  });

  it("mídia: upload (modo demo) e bloqueio de exclusão de imagem em uso", async () => {
    const cookie = await loginCookie();
    const png = new File([new Uint8Array([137, 80, 78, 71])], "Foto Cozinha.png", { type: "image/png" });
    const bad = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    const upload = await run(adminMedia.action, {
      request: postForm("/admin/midia", { intent: "upload", files: [png, bad] }, { Cookie: cookie }),
    });
    expect(upload.body.ok).toBe(true);
    expect(upload.body.uploaded).toHaveLength(1);
    expect(upload.body.uploaded[0]).toMatchObject({ alt: "Foto Cozinha", mime_type: "image/png" });
    expect(upload.body.uploaded[0].public_url).toMatch(/^data:image\/png;base64,/);
    expect(upload.body.errors[0]).toMatch(/formato não aceito/);

    const inUse = await run(adminMedia.action, {
      request: postForm("/admin/midia", { intent: "delete", id: "5e3d0000-0000-4000-8000-000000000301" }, { Cookie: cookie }),
    });
    expect(inUse.status).toBe(400);
    expect(inUse.body.message).toMatch(/em uso/);

    const free = await run(adminMedia.action, {
      request: postForm("/admin/midia", { intent: "delete", id: upload.body.uploaded[0].id }, { Cookie: cookie }),
    });
    expect(free.body.ok).toBe(true);
  });

  it("leads: muda status, anota, reenvia (demo) e exclui", async () => {
    const sent = await run(contact.action, { request: postJson("/briefing", minimalBriefing()) });
    const id = sent.body.leadId;
    const cookie = await loginCookie();
    const act = (fields) => run(adminLeads.action, { request: postForm("/admin/leads", { id, ...fields }, { Cookie: cookie }) });

    expect((await act({ intent: "status", status: "proposta" })).body.ok).toBe(true);
    expect((await act({ intent: "status", status: "inventado" })).status).toBe(400);
    expect((await act({ intent: "notes", internal_notes: "Ligar sexta" })).body.ok).toBe(true);
    expect((await act({ intent: "resend" })).body.message).toMatch(/Modo demonstração/);

    const panel = await run(adminLeads.loader, { request: get(`/admin/leads?lead=${id}`, { Cookie: cookie }) });
    expect(panel.body.selected).toMatchObject({ status: "proposta", internal_notes: "Ligar sexta" });

    const filtered = await run(adminLeads.loader, { request: get("/admin/leads?q=mariana&status=proposta", { Cookie: cookie }) });
    expect(filtered.body.leads).toHaveLength(1);
    const byPhone = await run(adminLeads.loader, { request: get("/admin/leads?q=99999-0000", { Cookie: cookie }) });
    expect(byPhone.body.leads).toHaveLength(1);

    expect((await act({ intent: "delete" })).body.ok).toBe(true);
    const after = await run(adminLeads.loader, { request: get("/admin/leads", { Cookie: cookie }) });
    expect(after.body.leads).toHaveLength(0);
  });

  it("logout apaga o cookie de sessão", async () => {
    const cookie = await loginCookie();
    const result = await run(adminLogin.action, { request: postForm("/admin/login", { intent: "logout" }, { Cookie: cookie }) });
    expect(result.status).toBe(302);
    expect(result.headers.get("Set-Cookie")).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});
