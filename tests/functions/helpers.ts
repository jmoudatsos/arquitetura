// deno-lint-ignore-file no-explicit-any
/**
 * Utilitários dos testes das Edge Functions (Deno).
 * O "banco" é o mesmo cliente em memória do modo demonstração do site,
 * que implementa a interface do supabase-js usada pelas funções.
 */
import { getDemoDb, resetDemoDb } from "../../app/lib/demo-db.server.js";

export const SUBMISSION_ID = "0f8e7a6b-1c2d-4e3f-8a9b-0c1d2e3f4a5b";

export function freshDb(): any {
  resetDemoDb();
  return getDemoDb();
}

export function briefing(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Mariana Albuquerque",
    whatsapp: "(48) 99999-0000",
    email: "mariana@email.com",
    cidade: "Florianópolis",
    tipoImovel: "Apartamento",
    statusImovel: "Em reforma",
    previsaoInicio: "Nos próximos 3 meses",
    investimentoPrevisto: "R$ 20.000 a 40.000",
    ambientesSelecionados: ["cozinha", "quarto"],
    detalhesAmbientes: { cozinha: { layout: "Com ilha central", necessidades: ["Calha úmida embutida na pedra"] } },
    estiloPrincipal: "minimalista",
    materiaisGostados: ["MDF amadeirado claro"],
    referencias: [],
    anexos: [],
    observacoesFinais: "",
    consentimento: true,
    submissionId: SUBMISSION_ID,
    origem: "briefing",
    utm: {},
    website: "",
    ...overrides,
  };
}

export function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/functions/v1/create-lead", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://site.test", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

type FetchCall = { url: string; init?: RequestInit };

/** Substitui o fetch global; devolve as chamadas feitas. */
export function stubFetch(responder: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    return await responder(url, init);
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

/** Define variáveis de ambiente e devolve uma função que restaura os valores anteriores. */
export function withEnv(values: Record<string, string | undefined>) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = Deno.env.get(key);
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  };
}
