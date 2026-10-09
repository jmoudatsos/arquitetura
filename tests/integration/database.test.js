// @vitest-environment node
/**
 * Banco de dados real (Postgres 18 via PGlite/WebAssembly — sem Docker):
 * aplica a migração + seed, roda a suíte pgTAP do projeto e confere o
 * contrato briefing (zod) → linha (mapper) → CHECKs do banco.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { briefingSchema } from "../../app/features/leads/lead.schema.js";
import { briefingToLeadRow } from "../../app/features/leads/lead.mapper.js";
import { DEMO_MEDIA, DEMO_PROJECTS, DEMO_SERVICES } from "../../app/lib/demo-data.js";
import { maximalBriefing, minimalBriefing } from "../fixtures/briefing.js";

const root = join(import.meta.dirname, "../..");
const read = (path) => readFileSync(join(root, path), "utf8");

let db;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(read("tests/integration/db/supabase-shim.sql"));
  await db.exec(read("supabase/migrations/0001_initial_schema.sql"));
  await db.exec(read("supabase/seed.sql"));
});

afterAll(async () => {
  await db?.close();
});

async function insertLeadAsServiceRole(row) {
  const columns = Object.keys(row);
  const values = columns.map((column) => {
    const value = row[column];
    if (value && typeof value === "object" && !Array.isArray(value)) return JSON.stringify(value);
    if (Array.isArray(value) && column === "attachments") return JSON.stringify(value);
    return value;
  });
  const placeholders = columns.map((column, index) => {
    if (["room_details", "attachments", "utm"].includes(column)) return `$${index + 1}::jsonb`;
    return `$${index + 1}`;
  });
  await db.exec("set role service_role");
  try {
    return await db.query(
      `insert into public.leads (${columns.join(", ")}) values (${placeholders.join(", ")}) returning *`,
      values,
    );
  } finally {
    await db.exec("reset role");
  }
}

describe("migração + seed", () => {
  it("cria o conteúdo de exemplo", async () => {
    const counts = await db.query(`
      select
        (select count(*)::int from public.projects) as projects,
        (select count(*)::int from public.projects where is_sample) as samples,
        (select count(*)::int from public.services) as services,
        (select count(*)::int from public.media) as media,
        (select studio_name from public.site_settings where id = 1) as studio
    `);
    expect(counts.rows[0]).toEqual({
      projects: DEMO_PROJECTS.length,
      samples: DEMO_PROJECTS.length,
      services: DEMO_SERVICES.length,
      media: DEMO_MEDIA.length,
      studio: "W Studio",
    });
  });

  it("o seed é idempotente (pode rodar duas vezes)", async () => {
    await expect(db.exec(read("supabase/seed.sql"))).resolves.not.toThrow();
    const { rows } = await db.query("select count(*)::int as total from public.projects");
    expect(rows[0].total).toBe(DEMO_PROJECTS.length);
  });

  it("visitante anônimo enxerga só o que é público", async () => {
    await db.exec("update public.projects set status = 'draft' where slug = 'cozinha-japandi'");
    await db.exec("set role anon");
    try {
      const projects = await db.query("select slug from public.projects");
      expect(projects.rows.map((row) => row.slug)).not.toContain("cozinha-japandi");
      expect(projects.rows).toHaveLength(DEMO_PROJECTS.length - 1);
      const leads = await db.query("select id from public.leads");
      expect(leads.rows).toHaveLength(0);
    } finally {
      await db.exec("reset role");
      await db.exec("update public.projects set status = 'published' where slug = 'cozinha-japandi'");
    }
  });
});

describe("contrato briefing → banco", () => {
  it("briefing mínimo vira um lead aceito pelos CHECKs", async () => {
    const parsed = briefingSchema.parse(minimalBriefing());
    const { rows } = await insertLeadAsServiceRole(briefingToLeadRow(parsed));
    expect(rows[0].whatsapp).toBe("5548999990000");
    expect(rows[0].status).toBe("novo");
    expect(rows[0].consent).toBe(true);
  });

  it("briefing máximo (todos os ambientes e respostas) também é aceito", async () => {
    const parsed = briefingSchema.parse(maximalBriefing());
    const row = briefingToLeadRow(parsed);
    const { rows } = await insertLeadAsServiceRole(row);
    expect(rows[0].rooms).toEqual(parsed.ambientesSelecionados);
    expect(rows[0].email).toBe("mariana@email.com");
    expect(Object.keys(rows[0].room_details)).toHaveLength(parsed.ambientesSelecionados.length);
    expect(rows[0].attachments).toHaveLength(2);
  });

  it("anônimo não consegue inserir lead direto (só a Edge Function)", async () => {
    const row = briefingToLeadRow(briefingSchema.parse(minimalBriefing()));
    await db.exec("set role anon");
    try {
      await expect(
        db.query("insert into public.leads (name, whatsapp) values ($1, $2)", [row.name, row.whatsapp]),
      ).rejects.toMatchObject({ code: "42501" });
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("suíte pgTAP (supabase/tests/database.test.sql)", () => {
  it("todas as asserções passam", async () => {
    await db.exec(read("tests/integration/db/pgtap-shim.sql"));
    const sql = read("supabase/tests/database.test.sql")
      .replace(/create extension[^;]*pgtap[^;]*;/i, "")
      .replace(/rollback;\s*$/i, "");

    await db.exec(sql);
    const planned = (await db.query("select planned from tap.plan")).rows[0]?.planned;
    const results = (await db.query("select ok, description from tap.results order by n")).rows;
    await db.exec("rollback");

    const failures = results.filter((row) => !row.ok).map((row) => row.description);
    expect(failures).toEqual([]);
    expect(results).toHaveLength(planned);
  });
});
