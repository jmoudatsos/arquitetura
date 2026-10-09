import { describe, expect, it } from "vitest";
import {
  briefingReducer,
  createInitialValues,
  DRAFT_KEY,
  loadDraft,
  parsePrefill,
  resolveMimeType,
  sanitizeRoomDetails,
  sanitizeValues,
  saveDraft,
  validateFiles,
} from "../../app/features/leads/briefing/briefing.state.js";

const reduce = (actions, start = createInitialValues()) => actions.reduce(briefingReducer, start);

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    raw: map,
  };
}

describe("briefingReducer", () => {
  it("alterna ambientes mantendo a ordem canônica e ignora ids desconhecidos", () => {
    const state = reduce([
      { type: "toggleRoom", roomId: "living" },
      { type: "toggleRoom", roomId: "cozinha" },
      { type: "toggleRoom", roomId: "garagem" },
    ]);
    expect(state.ambientesSelecionados).toEqual(["cozinha", "living"]);
    expect(reduce([{ type: "toggleRoom", roomId: "living" }], state).ambientesSelecionados).toEqual(["cozinha"]);
  });

  it("escolha única: clicar de novo desmarca", () => {
    const once = reduce([{ type: "setAnswer", roomId: "cozinha", questionId: "layout", value: "Linear" }]);
    expect(once.detalhesAmbientes.cozinha.layout).toBe("Linear");
    const twice = reduce([{ type: "setAnswer", roomId: "cozinha", questionId: "layout", value: "Linear" }], once);
    expect(twice.detalhesAmbientes.cozinha).not.toHaveProperty("layout");
  });

  it("múltipla escolha mantém a ordem das opções", () => {
    const state = reduce([
      { type: "toggleAnswer", roomId: "cozinha", questionId: "necessidades", option: "Calha úmida embutida na pedra" },
      { type: "toggleAnswer", roomId: "cozinha", questionId: "necessidades", option: "Torre quente para forno e micro-ondas" },
      { type: "toggleAnswer", roomId: "cozinha", questionId: "necessidades", option: "opção inexistente" },
    ]);
    expect(state.detalhesAmbientes.cozinha.necessidades).toEqual([
      "Torre quente para forno e micro-ondas",
      "Calha úmida embutida na pedra",
    ]);
  });

  it("matriz: define por linha e desmarca ao repetir", () => {
    let state = reduce([
      { type: "setMatrix", roomId: "cozinha", questionId: "eletros", rowId: "forno", value: "Vou comprar" },
      { type: "setMatrix", roomId: "cozinha", questionId: "eletros", rowId: "coifa", value: "Não terei" },
    ]);
    expect(state.detalhesAmbientes.cozinha.eletros).toEqual({ forno: "Vou comprar", coifa: "Não terei" });
    state = reduce([{ type: "setMatrix", roomId: "cozinha", questionId: "eletros", rowId: "forno", value: "Vou comprar" }], state);
    expect(state.detalhesAmbientes.cozinha.eletros).toEqual({ coifa: "Não terei" });
  });

  it("links de referência: sem duplicados e no máximo 5", () => {
    let state = createInitialValues();
    for (let i = 0; i < 7; i += 1) state = briefingReducer(state, { type: "addReference", url: `https://x.com/${i % 6}` });
    state = briefingReducer(state, { type: "addReference", url: "https://x.com/0" });
    expect(state.referencias).toHaveLength(5);
    expect(new Set(state.referencias).size).toBe(5);
    expect(briefingReducer(state, { type: "removeReference", index: 0 }).referencias).toHaveLength(4);
  });
});

describe("sanitização de rascunho / prefill", () => {
  it("descarta valores estranhos e respostas que não existem mais", () => {
    const clean = sanitizeValues({
      nome: "Ana",
      consentimento: "sim",
      website: "spam",
      ambientesSelecionados: ["quarto", "garagem"],
      estiloPrincipal: "barroco",
      detalhesAmbientes: {
        quarto: { fechamento: "Portas de abrir", tamanhoCama: "Cama redonda", usosExtras: ["Painel para Smart TV", "x"] },
        garagem: { a: 1 },
      },
    });
    expect(clean.nome).toBe("Ana");
    expect(clean.consentimento).toBe(false);
    expect(clean.website).toBe("");
    expect(clean.ambientesSelecionados).toEqual(["quarto"]);
    expect(clean.estiloPrincipal).toBe("");
    expect(clean.detalhesAmbientes).toEqual({
      quarto: { fechamento: "Portas de abrir", usosExtras: ["Painel para Smart TV"] },
    });
  });

  it("sanitizeRoomDetails tolera lixo", () => {
    expect(sanitizeRoomDetails(null)).toEqual({});
    expect(sanitizeRoomDetails({ cozinha: "x" })).toEqual({});
  });

  it("prefill: URL traz ambientes/estilo; estado da navegação traz nome/WhatsApp", () => {
    const searchParams = new URLSearchParams("ambientes=cozinha,quarto,xpto&estilo=organico");
    expect(parsePrefill({ searchParams })).toEqual({ ambientesSelecionados: ["cozinha", "quarto"], estiloPrincipal: "organico" });
    expect(
      parsePrefill({ state: { briefingPrefill: { ambientesSelecionados: ["office"], nome: "Ana", whatsapp: "(48) 9" } } }),
    ).toEqual({ ambientesSelecionados: ["office"], nome: "Ana", whatsapp: "(48) 9" });
    expect(parsePrefill({ state: { briefingPrefill: { ambientesSelecionados: [] } } })).toEqual({});
    expect(parsePrefill({})).toEqual({});
  });

  it("rascunho: salva sem honeypot/consentimento e restaura", () => {
    const storage = memoryStorage();
    const values = { ...createInitialValues(), nome: "Ana", consentimento: true, website: "x" };
    saveDraft({ values, step: 3, maxReached: 4 }, storage);
    const stored = JSON.parse(storage.getItem(DRAFT_KEY));
    expect(stored.values).not.toHaveProperty("website");
    expect(stored.values).not.toHaveProperty("consentimento");
    expect(loadDraft(storage)).toMatchObject({ step: 3, maxReached: 4, values: { nome: "Ana", consentimento: false } });
  });

  it("rascunho expirado ou corrompido é ignorado", () => {
    const storage = memoryStorage();
    storage.setItem(DRAFT_KEY, JSON.stringify({ values: { nome: "x" }, savedAt: Date.now() - 30 * 86400000 }));
    expect(loadDraft(storage)).toBeNull();
    expect(storage.getItem(DRAFT_KEY)).toBeNull();
    storage.setItem(DRAFT_KEY, "{quebrado");
    expect(loadDraft(storage)).toBeNull();
  });
});

describe("arquivos", () => {
  const file = (name, size, type = "") => ({ name, size, type });

  it("deduz o tipo de HEIC sem MIME informado", () => {
    expect(resolveMimeType(file("foto.HEIC", 10))).toBe("image/heic");
    expect(resolveMimeType(file("x.pdf", 10, "application/pdf"))).toBe("application/pdf");
    expect(resolveMimeType(file("x.exe", 10))).toBe("");
  });

  it("aceita/rejeita por formato, tamanho, duplicidade e limite", () => {
    const existing = Array.from({ length: 6 }, (_, i) => ({ name: `f${i}.pdf`, size: 1 }));
    const { accepted, rejected } = validateFiles(existing, [
      file("planta.pdf", 100, "application/pdf"),
      file("virus.exe", 100, "application/x-msdownload"),
      file("enorme.jpg", 30 * 1024 * 1024, "image/jpeg"),
      file("f0.pdf", 1, "application/pdf"),
      file("foto.png", 100, "image/png"),
      file("excedente.png", 100, "image/png"),
    ]);
    expect(accepted.map((f) => f.name)).toEqual(["planta.pdf", "foto.png"]);
    expect(rejected.map((r) => [r.name, r.reason])).toEqual([
      ["virus.exe", expect.stringContaining("formato")],
      ["enorme.jpg", "acima de 25 MB"],
      ["f0.pdf", "já adicionado"],
      ["excedente.png", "limite de 8 arquivos"],
    ]);
  });
});
