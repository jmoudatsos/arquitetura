// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { notifyLead, sendEmail, sendWhatsApp } from "../../supabase/functions/_shared/notifications.ts";
import { freshDb, stubFetch, withEnv } from "./helpers.ts";

const lead = {
  id: "5e3d0000-0000-4000-8000-00000000aaaa",
  created_at: "2026-10-08T12:00:00.000Z",
  name: "Mariana Albuquerque",
  whatsapp: "5548999990000",
  email: "mariana@email.com",
  city: "Florianópolis",
  property_type: "Apartamento",
  property_status: "Em reforma",
  start_forecast: "Nos próximos 3 meses",
  budget_range: "R$ 20.000 a 40.000",
  rooms: ["cozinha"],
  room_details: { cozinha: { layout: "Com ilha central" } },
  style: "minimalista",
  materials: [],
  reference_links: [],
  attachments: [],
  notes: "<script>alert(1)</script>",
};

Deno.test("CallMeBot: monta a URL com telefone, apikey e texto", async () => {
  const restoreEnv = withEnv({ WHATSAPP_PROVIDER: "callmebot", CALLMEBOT_API_KEY: "123456" });
  const fetchStub = stubFetch(() => new Response("Message queued. You will receive it in a few seconds."));
  try {
    const result = await sendWhatsApp({ to: "5548988887777", text: "Olá *mundo*", lead });
    assertEquals(result.status, "sent");
    const url = new URL(fetchStub.calls[0].url);
    assertEquals(url.origin + url.pathname, "https://api.callmebot.com/whatsapp.php");
    assertEquals(url.searchParams.get("phone"), "+5548988887777");
    assertEquals(url.searchParams.get("apikey"), "123456");
    assertEquals(url.searchParams.get("text"), "Olá *mundo*");
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});

Deno.test("CallMeBot: resposta de erro vira 'failed' com detalhe", async () => {
  const restoreEnv = withEnv({ WHATSAPP_PROVIDER: "callmebot", CALLMEBOT_API_KEY: "errada" });
  const fetchStub = stubFetch(() => new Response("<p>APIKey is invalid</p>"));
  try {
    const result = await sendWhatsApp({ to: "5548988887777", text: "x", lead });
    assertEquals(result.status, "failed");
    assertStringIncludes(result.detail ?? "", "APIKey is invalid");
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});

Deno.test("WhatsApp sem chave configurada → 'skipped' (sem chamar a rede)", async () => {
  const restoreEnv = withEnv({ WHATSAPP_PROVIDER: "callmebot", CALLMEBOT_API_KEY: undefined });
  const fetchStub = stubFetch(() => new Response("nunca"));
  try {
    const result = await sendWhatsApp({ to: "5548988887777", text: "x", lead });
    assertEquals(result.status, "skipped");
    assertEquals(fetchStub.calls.length, 0);
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});

Deno.test("Meta Cloud API: envia template com as 4 variáveis", async () => {
  const restoreEnv = withEnv({
    WHATSAPP_PROVIDER: "meta",
    META_WA_TOKEN: "tok",
    META_WA_PHONE_NUMBER_ID: "999",
    META_WA_TEMPLATE: "novo_briefing",
    META_WA_TEMPLATE_LANG: undefined,
  });
  const fetchStub = stubFetch(() => Response.json({ messages: [{ id: "wamid.1" }] }));
  try {
    const result = await sendWhatsApp({ to: "5548988887777", text: "x", lead, adminUrl: "https://site.test/admin" });
    assertEquals(result, { status: "sent", id: "wamid.1" });
    assertEquals(fetchStub.calls[0].url, "https://graph.facebook.com/v21.0/999/messages");
    const body = JSON.parse(String(fetchStub.calls[0].init?.body));
    assertEquals(body.template.name, "novo_briefing");
    assertEquals(body.template.language.code, "pt_BR");
    assertEquals(
      body.template.components[0].parameters.map((p: any) => p.text),
      ["Mariana Albuquerque", "+55 (48) 99999-0000", "Cozinha", "https://site.test/admin"],
    );
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});

Deno.test("Twilio: POST form-urlencoded com autenticação básica", async () => {
  const restoreEnv = withEnv({
    WHATSAPP_PROVIDER: "twilio",
    TWILIO_ACCOUNT_SID: "AC1",
    TWILIO_AUTH_TOKEN: "secret",
    TWILIO_WHATSAPP_FROM: "whatsapp:+14155238886",
  });
  const fetchStub = stubFetch(() => Response.json({ sid: "SM1" }, { status: 201 }));
  try {
    const result = await sendWhatsApp({ to: "5548988887777", text: "Olá", lead });
    assertEquals(result, { status: "sent", id: "SM1" });
    const init = fetchStub.calls[0].init!;
    assertEquals((init.headers as any).Authorization, `Basic ${btoa("AC1:secret")}`);
    const form = new URLSearchParams(String(init.body));
    assertEquals(form.get("To"), "whatsapp:+5548988887777");
    assertEquals(form.get("Body"), "Olá");
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});

Deno.test("Resend: envia e-mail com reply_to do cliente; erro HTTP vira 'failed'", async () => {
  const restoreEnv = withEnv({ RESEND_API_KEY: "re_test", NOTIFY_EMAIL_FROM: "Briefing <b@site.test>" });
  let status = 200;
  const fetchStub = stubFetch(() =>
    status === 200 ? Response.json({ id: "email_1" }) : Response.json({ message: "domain not verified" }, { status }),
  );
  try {
    const ok = await sendEmail({ to: ["equipe@site.test"], subject: "Assunto", html: "<p>x</p>", text: "x", replyTo: "c@x.com" });
    assertEquals(ok, { status: "sent", id: "email_1" });
    const body = JSON.parse(String(fetchStub.calls[0].init?.body));
    assertEquals(body.from, "Briefing <b@site.test>");
    assertEquals(body.to, ["equipe@site.test"]);
    assertEquals(body.reply_to, "c@x.com");

    status = 403;
    const failed = await sendEmail({ to: ["equipe@site.test"], subject: "s", html: "h", text: "t" });
    assertEquals(failed.status, "failed");
    assertStringIncludes(failed.detail ?? "", "domain not verified");
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});

Deno.test("notifyLead: usa destinos do painel, escapa HTML e grava o resultado no lead", async () => {
  const restoreEnv = withEnv({
    RESEND_API_KEY: "re_test",
    WHATSAPP_PROVIDER: "callmebot",
    CALLMEBOT_API_KEY: "123",
    SITE_URL: "https://site.test",
    NOTIFY_EMAIL_TO: "fallback@site.test",
  });
  const db = freshDb();
  await db.from("leads").insert({ ...lead });
  await db
    .from("notification_settings")
    .update({ email_recipients: ["painel@site.test"], whatsapp_recipient: "5548911112222" })
    .eq("id", 1);

  const fetchStub = stubFetch((url) =>
    url.startsWith("https://api.resend.com") ? Response.json({ id: "email_9" }) : new Response("Message queued"),
  );
  try {
    const record = await notifyLead(db, lead);
    assertEquals(record.email.status, "sent");
    assertEquals(record.whatsapp.status, "sent");

    const emailCall = fetchStub.calls.find((call) => call.url.startsWith("https://api.resend.com"))!;
    const email = JSON.parse(String(emailCall.init?.body));
    assertEquals(email.to, ["painel@site.test"]);
    assertStringIncludes(email.subject, "Mariana Albuquerque");
    assert(!email.html.includes("<script>"), "conteúdo do cliente é escapado no HTML");
    assertStringIncludes(email.html, "&lt;script&gt;");
    assertStringIncludes(email.html, `https://site.test/admin/leads?lead=${lead.id}`);

    const whatsappCall = fetchStub.calls.find((call) => call.url.includes("callmebot"))!;
    assertEquals(new URL(whatsappCall.url).searchParams.get("phone"), "+5548911112222");

    const { data: saved } = await db.from("leads").select("*").eq("id", lead.id).single();
    assertEquals(saved.notification.email.status, "sent");
    assert(saved.notified_at, "notified_at preenchido");
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});

Deno.test("notifyLead: canais desativados no painel não disparam nada", async () => {
  const restoreEnv = withEnv({ RESEND_API_KEY: "re_test", CALLMEBOT_API_KEY: "123" });
  const db = freshDb();
  await db.from("leads").insert({ ...lead });
  await db.from("notification_settings").update({ email_enabled: false, whatsapp_enabled: false }).eq("id", 1);
  const fetchStub = stubFetch(() => new Response("x"));
  try {
    const record = await notifyLead(db, lead);
    assertEquals(record.email.status, "disabled");
    assertEquals(record.whatsapp.status, "disabled");
    assertEquals(fetchStub.calls.length, 0);
  } finally {
    fetchStub.restore();
    restoreEnv();
  }
});
