// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "@std/assert";
import { notifyLeadHandler } from "../../supabase/functions/_shared/notify-lead.handler.ts";
import { freshDb, withEnv } from "./helpers.ts";

const LEAD_ID = "5e3d0000-0000-4000-8000-00000000bbbb";
const ADMIN_ID = "11111111-1111-4111-8111-111111111111";

async function setup() {
  const db = freshDb();
  await db.from("leads").insert({ id: LEAD_ID, name: "Cliente", whatsapp: "5548999990000", rooms: ["cozinha"] });
  await db.from("admin_users").insert({ user_id: ADMIN_ID, role: "owner" });
  const supabase = {
    ...db,
    from: db.from,
    auth: {
      getUser: (token: string) =>
        Promise.resolve(
          token === "jwt-admin"
            ? { data: { user: { id: ADMIN_ID } }, error: null }
            : token === "jwt-comum"
            ? { data: { user: { id: "22222222-2222-4222-8222-222222222222" } }, error: null }
            : { data: { user: null }, error: { message: "invalid JWT" } },
        ),
    },
  };
  const calls: any[] = [];
  const handler = notifyLeadHandler({
    supabase,
    notify: (_db, lead) => {
      calls.push(lead);
      return Promise.resolve({ email: { status: "sent" }, whatsapp: { status: "sent" } });
    },
  });
  return { handler, calls };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/functions/v1/notify-lead", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

Deno.test("sem credenciais → 401", async () => {
  const restoreEnv = withEnv({ NOTIFY_SECRET: "s3cr3t" });
  const { handler, calls } = await setup();
  assertEquals((await handler(request({ lead_id: LEAD_ID }))).status, 401);
  assertEquals((await handler(request({ lead_id: LEAD_ID }, { "x-notify-secret": "errado" }))).status, 401);
  assertEquals((await handler(request({ lead_id: LEAD_ID }, { authorization: "Bearer jwt-comum" }))).status, 401);
  assertEquals(calls.length, 0);
  restoreEnv();
});

Deno.test("admin logado (JWT) reenvia a notificação", async () => {
  const restoreEnv = withEnv({ NOTIFY_SECRET: undefined });
  const { handler, calls } = await setup();
  const response = await handler(request({ lead_id: LEAD_ID }, { authorization: "Bearer jwt-admin" }));
  assertEquals(response.status, 200);
  assertEquals((await response.json()).results.email.status, "sent");
  assertEquals(calls[0].id, LEAD_ID);
  restoreEnv();
});

Deno.test("Database Webhook com x-notify-secret e payload { record }", async () => {
  const restoreEnv = withEnv({ NOTIFY_SECRET: "s3cr3t" });
  const { handler, calls } = await setup();
  const response = await handler(
    request({ type: "INSERT", table: "leads", record: { id: LEAD_ID } }, { "x-notify-secret": "s3cr3t" }),
  );
  assertEquals(response.status, 200);
  assertEquals(calls.length, 1);
  restoreEnv();
});

Deno.test("lead_id inválido → 400; inexistente → 404", async () => {
  const restoreEnv = withEnv({ NOTIFY_SECRET: "s3cr3t" });
  const { handler } = await setup();
  const auth = { "x-notify-secret": "s3cr3t" };
  assertEquals((await handler(request({ lead_id: "1; drop table leads" }, auth))).status, 400);
  assertEquals((await handler(request({ lead_id: "5e3d0000-0000-4000-8000-00000000ffff" }, auth))).status, 404);
  restoreEnv();
});
