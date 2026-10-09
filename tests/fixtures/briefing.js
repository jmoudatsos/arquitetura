/**
 * Briefings de exemplo para os testes.
 */
import { ROOM_IDS, ROOM_QUESTIONS, MATERIALS } from "../../app/features/leads/briefing.options.js";

export const SUBMISSION_ID = "0f8e7a6b-1c2d-4e3f-8a9b-0c1d2e3f4a5b";

/** Briefing mínimo válido. */
export function minimalBriefing(overrides = {}) {
  return {
    nome: "Mariana Albuquerque",
    whatsapp: "(48) 99999-0000",
    email: "",
    cidade: "",
    tipoImovel: "Apartamento",
    statusImovel: "Em reforma",
    previsaoInicio: "Nos próximos 3 meses",
    investimentoPrevisto: "R$ 20.000 a 40.000",
    ambientesSelecionados: ["cozinha"],
    detalhesAmbientes: {},
    estiloPrincipal: "",
    materiaisGostados: [],
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

/** Respostas para TODAS as perguntas de um ambiente (primeira opção de cada). */
export function answerEverything(roomId) {
  const answers = {};
  for (const question of ROOM_QUESTIONS[roomId]) {
    if (question.type === "single") answers[question.id] = question.options[0];
    if (question.type === "multi") answers[question.id] = [...question.options];
    if (question.type === "matrix") {
      answers[question.id] = Object.fromEntries(question.rows.map((row) => [row.id, question.options[0]]));
    }
    if (question.type === "text") answers[question.id] = `Observação sobre ${roomId} com "aspas" & <tags>`;
  }
  return answers;
}

/** Briefing máximo: todos os ambientes, todas as respostas, anexos e links. */
export function maximalBriefing(overrides = {}) {
  return minimalBriefing({
    email: "Mariana@Email.com",
    cidade: "Florianópolis / Itacorubi",
    ambientesSelecionados: [...ROOM_IDS],
    detalhesAmbientes: Object.fromEntries(ROOM_IDS.map((id) => [id, answerEverything(id)])),
    estiloPrincipal: "contemporaneo",
    materiaisGostados: [...MATERIALS],
    referencias: ["https://br.pinterest.com/pin/123/", "https://www.instagram.com/p/abc/"],
    anexos: [
      { path: `${SUBMISSION_ID}/a1b2c3d4-planta.pdf`, name: "Planta.pdf", size: 2_000_000, type: "application/pdf" },
      { path: `${SUBMISSION_ID}/e5f6a7b8-cozinha.jpg`, name: "Cozinha.jpg", size: 800_000, type: "image/jpeg" },
    ],
    observacoesFinais: "Priorizamos móveis duráveis e fáceis de limpar.",
    utm: { utm_source: "instagram", utm_campaign: "outubro" },
    ...overrides,
  });
}
