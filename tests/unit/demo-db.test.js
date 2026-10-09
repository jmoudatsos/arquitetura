// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { getDemoDb, resetDemoDb } from "../../app/lib/demo-db.server.js";
import { DEMO_PROJECTS } from "../../app/lib/demo-data.js";

let db;
beforeEach(() => {
  resetDemoDb();
  db = getDemoDb();
});

describe("banco demo (interface do supabase-js)", () => {
  it("select + eq + order + limit + colunas", async () => {
    const { data, error } = await db
      .from("projects")
      .select("slug, sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: false })
      .limit(2);
    expect(error).toBeNull();
    expect(data).toEqual([
      { slug: "cozinha-japandi", sort_order: 7 },
      { slug: "espaco-gourmet-integrado", sort_order: 6 },
    ]);
  });

  it("count/head e range", async () => {
    const head = await db.from("projects").select("id", { count: "exact", head: true });
    expect(head).toMatchObject({ data: null, count: DEMO_PROJECTS.length });
    const page = await db.from("projects").select("slug").order("sort_order").range(1, 2);
    expect(page.data.map((p) => p.slug)).toEqual(["living-painel-ripado", "suite-marcenaria-integrada"]);
  });

  it("single/maybeSingle seguem os códigos do PostgREST", async () => {
    expect((await db.from("projects").select("*").eq("slug", "nao-existe").maybeSingle()).data).toBeNull();
    const single = await db.from("projects").select("*").eq("slug", "nao-existe").single();
    expect(single.error.code).toBe("PGRST116");
    const many = await db.from("projects").select("*").maybeSingle();
    expect(many.error.code).toBe("PGRST116");
  });

  it("insert com defaults + unique de slug (23505)", async () => {
    const created = await db.from("projects").insert({ slug: "novo", title: "Novo", category: "living" }).select("*").single();
    expect(created.data).toMatchObject({ status: "draft", featured: false, gallery: [], is_sample: false });
    expect(created.data.id).toMatch(/^[0-9a-f-]{36}$/);
    const dup = await db.from("projects").insert({ slug: "novo", title: "Outro", category: "living" });
    expect(dup.error.code).toBe("23505");
  });

  it("update aplica gatilho de published_at e updated_at; não vaza referências", async () => {
    const { data } = await db.from("projects").insert({ slug: "rascunho", title: "R", category: "office" }).select("*").single();
    expect(data.published_at).toBeNull();
    data.title = "mutado fora do banco";
    const updated = await db.from("projects").update({ status: "published" }).eq("id", data.id).select("*").single();
    expect(updated.data.published_at).toBeTruthy();
    expect(updated.data.title).toBe("R");
  });

  it("ilike / or / in / contains", async () => {
    const ilike = await db.from("projects").select("slug").ilike("title", "%cozinha%");
    expect(ilike.data.map((p) => p.slug).sort()).toEqual(["cozinha-japandi", "cozinha-nogueira-e-pedra"]);
    const or = await db.from("projects").select("slug").or("title.ilike.*japandi*,slug.eq.home-office-nogueira");
    expect(or.data.map((p) => p.slug).sort()).toEqual(["cozinha-japandi", "home-office-nogueira"]);
    const inQuery = await db.from("projects").select("slug").in("category", ["banheiro", "gourmet"]);
    expect(inQuery.data).toHaveLength(2);
    const contains = await db.from("projects").select("slug").contains("materials", ["MDF RU"]);
    expect(contains.data.map((p) => p.slug)).toEqual(["espaco-gourmet-integrado"]);
  });

  it("delete com filtro", async () => {
    await db.from("services").delete().eq("slug", "projeto-3d");
    const { count } = await db.from("services").select("id", { count: "exact", head: true });
    expect(count).toBe(5);
  });

  it("storage em memória: upload/list/remove", async () => {
    const bucket = db.storage.from("briefing-uploads");
    await bucket.upload("pasta/a.pdf", new Blob(["x"]));
    expect((await bucket.upload("pasta/a.pdf", new Blob(["y"]))).error.statusCode).toBe("409");
    expect((await bucket.list("pasta")).data).toEqual([{ name: "a.pdf" }]);
    await bucket.remove(["pasta/a.pdf"]);
    expect((await bucket.list("pasta")).data).toEqual([]);
  });

  it("tabela desconhecida falha cedo", () => {
    expect(() => db.from("nao_existe")).toThrow(/tabela desconhecida/);
  });
});
