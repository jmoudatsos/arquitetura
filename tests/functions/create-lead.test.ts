// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertExists } from "@std/assert";
import { createLeadHandler } from "../../supabase/functions/_shared/create-lead.handler.ts";
import { briefing, freshDb, post, SUBMISSION_ID, withEnv } from "./helpers.ts";

function setup(options: { notifyOnCreate?: string } = {}) {
  const restoreEnv = withEnv({ NOTIFY_ON_CREATE: options.notifyOnCreate, ALLOWED_ORIGINS: undefined });
  const db = freshDb();
  const notified: any[] = [];
  const handler = createLeadHandler({
    supabase: db,
    notify: (_db, lead) => {
      notified.push(lead);
      return Promise.resolve({ email: { status: "sent" }, whatsapp: { status: "skipped" } });
    },
  });
  return { db, handler, notified, restoreEnv };
}

async function leadsIn(db: any) {
  const { data } = await db.from("leads").select("*");
  return data as any[];
}

Deno.test("OPTIONS responde CORS", async () => {
  const { handler, restoreEnv } = setup();
  const response = await handler(new Request("http://localhost", { method: "OPTIONS" }));
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("access-control-allow-origin"), "*");
  restoreEnv();
});

Deno.test("método diferente de POST → 405", async () => {
  const { handler, restoreEnv } = setup();
  const response = await handler(new Request("http://localhost", { method: "GET" }));
  assertEquals(response.status, 405);
  restoreEnv();
});

Deno.test("JSON inválido → 400", async () => {
  const { handler, restoreEnv } = setup();
  const response = await handler(post("{nope"));
  assertEquals(response.status, 400);
  restoreEnv();
});

Deno.test("honeypot preenchido → finge sucesso e não grava", async () => {
  const { handler, db, notified, restoreEnv } = setup();
  const response = await handler(post(briefing({ website: "http://spam.example" })));
  assertEquals(response.status, 200);
  assertEquals((await response.json()).lead_id, null);
  assertEquals((await leadsIn(db)).length, 0);
  assertEquals(notified.length, 0);
  restoreEnv();
});

Deno.test("payload inválido → 422 com o campo do erro", async () => {
  const { handler, db, restoreEnv } = setup();
  const response = await handler(post(briefing({ nome: "", consentimento: false })));
  assertEquals(response.status, 422);
  const body = await response.json();
  const paths = body.issues.map((issue: any) => issue.path);
  assert(paths.includes("nome"));
  assert(paths.includes("consentimento"));
  assertEquals((await leadsIn(db)).length, 0);
  restoreEnv();
});

Deno.test("briefing válido → 201, grava normalizado, guarda só anexos realmente enviados e notifica", async () => {
  const { handler, db, notified, restoreEnv } = setup();
  // Só um dos dois anexos chegou ao Storage.
  await db.storage.from("briefing-uploads").upload(`${SUBMISSION_ID}/a1b2c3d4-planta.pdf`, new Blob(["%PDF"]));
  const payload = briefing({
    anexos: [
      { path: `${SUBMISSION_ID}/a1b2c3d4-planta.pdf`, name: "planta.pdf", size: 1000, type: "application/pdf" },
      { path: `${SUBMISSION_ID}/e5f6a7b8-falso.pdf`, name: "falso.pdf", size: 1000, type: "application/pdf" },
    ],
  });

  const response = await handler(post(payload, { "x-client-ip": "203.0.113.7", "x-client-user-agent": "Teste/1.0" }));
  assertEquals(response.status, 201);
  const body = await response.json();
  assertExists(body.lead_id);
  assertEquals(body.notification, { email: "sent", whatsapp: "skipped" });

  const [lead] = await leadsIn(db);
  assertEquals(lead.id, body.lead_id);
  assertEquals(lead.whatsapp, "5548999990000");
  assertEquals(lead.rooms, ["cozinha", "quarto"]);
  assertEquals(lead.attachments.map((a: any) => a.name), ["planta.pdf"]);
  assertEquals(lead.user_agent, "Teste/1.0");
  assertEquals(lead.ip_hash.length, 64);
  assert(!lead.ip_hash.includes("203.0.113.7"), "IP nunca é salvo em texto puro");
  assertEquals(notified.length, 1);
  restoreEnv();
});

Deno.test("limite por IP: 6º envio em 10 min → 429", async () => {
  const { handler, db, restoreEnv } = setup();
  for (let i = 0; i < 5; i += 1) {
    const response = await handler(post(briefing({ whatsapp: `(48) 9999${i}-000${i}` }), { "x-client-ip": "198.51.100.1" }));
    assertEquals(response.status, 201);
  }
  const blocked = await handler(post(briefing({ whatsapp: "(48) 98888-7777" }), { "x-client-ip": "198.51.100.1" }));
  assertEquals(blocked.status, 429);
  const otherIp = await handler(post(briefing({ whatsapp: "(48) 98888-7777" }), { "x-client-ip": "198.51.100.2" }));
  assertEquals(otherIp.status, 201);
  assertEquals((await leadsIn(db)).length, 6);
  restoreEnv();
});

Deno.test("limite por WhatsApp: 4º envio do mesmo número em 1 h → 429", async () => {
  const { handler, restoreEnv } = setup();
  for (let i = 0; i < 3; i += 1) {
    const response = await handler(post(briefing(), { "x-client-ip": `192.0.2.${i}` }));
    assertEquals(response.status, 201);
  }
  const blocked = await handler(post(briefing(), { "x-client-ip": "192.0.2.99" }));
  assertEquals(blocked.status, 429);
  restoreEnv();
});

Deno.test("NOTIFY_ON_CREATE=false → grava sem notificar (fluxo via Database Webhook)", async () => {
  const { handler, notified, restoreEnv } = setup({ notifyOnCreate: "false" });
  const response = await handler(post(briefing()));
  assertEquals(response.status, 201);
  assertEquals((await response.json()).notification, null);
  assertEquals(notified.length, 0);
  restoreEnv();
});

Deno.test("falha na notificação não impede o registro do lead", async () => {
  const restoreEnv = withEnv({ NOTIFY_ON_CREATE: undefined });
  const db = freshDb();
  const handler = createLeadHandler({
    supabase: db,
    notify: () => Promise.reject(new Error("provedor fora do ar")),
  });
  const response = await handler(post(briefing()));
  assertEquals(response.status, 201);
  assertEquals((await leadsIn(db)).length, 1);
  restoreEnv();
});
