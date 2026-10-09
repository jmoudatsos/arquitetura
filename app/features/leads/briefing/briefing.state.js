/**
 * Estado do assistente de briefing (reducer puro → fácil de testar).
 */
import {
  ATTACHMENT_RULES,
  MATERIALS,
  MAX_REFERENCE_LINKS,
  ROOM_IDS,
  ROOM_QUESTIONS,
  STYLE_IDS,
} from "../briefing.options.js";

export const STEP_NAMES = ["Sobre você", "Ambientes", "Detalhes técnicos", "Estilo & materiais", "Revisão"];
export const TOTAL_STEPS = STEP_NAMES.length;
export const DRAFT_KEY = "briefing-rascunho-v1";
const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function createInitialValues() {
  return {
    nome: "",
    whatsapp: "",
    email: "",
    cidade: "",
    tipoImovel: "",
    statusImovel: "",
    previsaoInicio: "",
    investimentoPrevisto: "",
    ambientesSelecionados: [],
    detalhesAmbientes: {},
    estiloPrincipal: "",
    materiaisGostados: [],
    referencias: [],
    observacoesFinais: "",
    consentimento: false,
    website: "", // honeypot
  };
}

function findQuestion(roomId, questionId) {
  return (ROOM_QUESTIONS[roomId] ?? []).find((question) => question.id === questionId) ?? null;
}

function withRoomAnswer(state, roomId, questionId, value) {
  const room = { ...(state.detalhesAmbientes[roomId] ?? {}) };
  if (value === undefined) delete room[questionId];
  else room[questionId] = value;
  return { ...state, detalhesAmbientes: { ...state.detalhesAmbientes, [roomId]: room } };
}

export function briefingReducer(state, action) {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value };

    case "toggleRoom": {
      if (!ROOM_IDS.includes(action.roomId)) return state;
      const selected = state.ambientesSelecionados.includes(action.roomId)
        ? state.ambientesSelecionados.filter((id) => id !== action.roomId)
        : [...state.ambientesSelecionados, action.roomId];
      // Mantém a ordem canônica dos ambientes (Cozinha, Quarto, Living…).
      return { ...state, ambientesSelecionados: ROOM_IDS.filter((id) => selected.includes(id)) };
    }

    case "setAnswer": {
      // Escolha única: clicar de novo na opção marcada desmarca.
      const question = findQuestion(action.roomId, action.questionId);
      if (!question) return state;
      const current = state.detalhesAmbientes[action.roomId]?.[action.questionId];
      const value = question.type === "single" && current === action.value ? undefined : action.value;
      return withRoomAnswer(state, action.roomId, action.questionId, value);
    }

    case "toggleAnswer": {
      const question = findQuestion(action.roomId, action.questionId);
      if (!question || !question.options.includes(action.option)) return state;
      const current = state.detalhesAmbientes[action.roomId]?.[action.questionId] ?? [];
      const next = current.includes(action.option)
        ? current.filter((option) => option !== action.option)
        : question.options.filter((option) => [...current, action.option].includes(option));
      return withRoomAnswer(state, action.roomId, action.questionId, next);
    }

    case "setMatrix": {
      const question = findQuestion(action.roomId, action.questionId);
      if (!question) return state;
      const current = { ...(state.detalhesAmbientes[action.roomId]?.[action.questionId] ?? {}) };
      if (current[action.rowId] === action.value) delete current[action.rowId];
      else current[action.rowId] = action.value;
      return withRoomAnswer(state, action.roomId, action.questionId, current);
    }

    case "toggleMaterial": {
      if (!MATERIALS.includes(action.material)) return state;
      const has = state.materiaisGostados.includes(action.material);
      const next = has
        ? state.materiaisGostados.filter((m) => m !== action.material)
        : MATERIALS.filter((m) => [...state.materiaisGostados, action.material].includes(m));
      return { ...state, materiaisGostados: next };
    }

    case "addReference": {
      const url = String(action.url ?? "").trim();
      if (!url || state.referencias.includes(url) || state.referencias.length >= MAX_REFERENCE_LINKS) return state;
      return { ...state, referencias: [...state.referencias, url] };
    }

    case "removeReference":
      return { ...state, referencias: state.referencias.filter((_, index) => index !== action.index) };

    case "hydrate":
      return sanitizeValues({ ...state, ...action.values });

    case "reset":
      return createInitialValues();

    default:
      return state;
  }
}

/** Descarta valores estranhos vindos do rascunho salvo ou da URL. */
export function sanitizeValues(values) {
  const base = createInitialValues();
  const out = { ...base };
  for (const key of Object.keys(base)) {
    if (!(key in values)) continue;
    const value = values[key];
    if (typeof base[key] === "string" && typeof value === "string") out[key] = value.slice(0, 4000);
    if (typeof base[key] === "boolean" && typeof value === "boolean") out[key] = value;
  }
  out.ambientesSelecionados = ROOM_IDS.filter((id) => (values.ambientesSelecionados ?? []).includes(id));
  out.materiaisGostados = MATERIALS.filter((m) => (values.materiaisGostados ?? []).includes(m));
  out.referencias = (Array.isArray(values.referencias) ? values.referencias : [])
    .filter((url) => typeof url === "string")
    .slice(0, MAX_REFERENCE_LINKS);
  out.estiloPrincipal = STYLE_IDS.includes(values.estiloPrincipal) ? values.estiloPrincipal : "";
  out.detalhesAmbientes = sanitizeRoomDetails(values.detalhesAmbientes);
  out.website = "";
  return out;
}

/**
 * Mantém só respostas que ainda existem nas opções atuais. Sem isso, um
 * rascunho antigo (opção renomeada) travaria o envio com um erro invisível.
 */
export function sanitizeRoomDetails(details) {
  const out = {};
  if (!details || typeof details !== "object") return out;
  for (const roomId of ROOM_IDS) {
    const answers = details[roomId];
    if (!answers || typeof answers !== "object") continue;
    const clean = {};
    for (const question of ROOM_QUESTIONS[roomId] ?? []) {
      const value = answers[question.id];
      if (question.type === "single" && question.options.includes(value)) clean[question.id] = value;
      if (question.type === "multi" && Array.isArray(value)) {
        const valid = question.options.filter((option) => value.includes(option));
        if (valid.length) clean[question.id] = valid;
      }
      if (question.type === "matrix" && value && typeof value === "object") {
        const rows = {};
        for (const row of question.rows) {
          if (question.options.includes(value[row.id])) rows[row.id] = value[row.id];
        }
        if (Object.keys(rows).length) clean[question.id] = rows;
      }
      if (question.type === "text" && typeof value === "string" && value.trim()) clean[question.id] = value.slice(0, 1500);
    }
    if (Object.keys(clean).length) out[roomId] = clean;
  }
  return out;
}

/**
 * Pré-preenchimento vindo da URL (?ambientes=cozinha,quarto&estilo=minimalista)
 * ou do card da home (via state de navegação, sem dados pessoais na URL).
 */
export function parsePrefill({ searchParams, state } = {}) {
  const prefill = {};
  const rooms = String(searchParams?.get?.("ambientes") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => ROOM_IDS.includes(id));
  const style = searchParams?.get?.("estilo");

  if (rooms.length) prefill.ambientesSelecionados = rooms;
  if (style && STYLE_IDS.includes(style)) prefill.estiloPrincipal = style;

  const fromState = state?.briefingPrefill;
  if (fromState && typeof fromState === "object") {
    if (Array.isArray(fromState.ambientesSelecionados)) {
      const stateRooms = fromState.ambientesSelecionados.filter((id) => ROOM_IDS.includes(id));
      if (stateRooms.length) prefill.ambientesSelecionados = stateRooms;
    }
    if (typeof fromState.nome === "string" && fromState.nome.trim()) prefill.nome = fromState.nome.slice(0, 120);
    if (typeof fromState.whatsapp === "string" && fromState.whatsapp.trim()) prefill.whatsapp = fromState.whatsapp.slice(0, 25);
  }
  return prefill;
}

/* ─────────────────────────── Rascunho (localStorage) ─────────────────────────── */

export function loadDraft(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft?.values || Date.now() - (draft.savedAt ?? 0) > DRAFT_MAX_AGE_MS) {
      storage.removeItem(DRAFT_KEY);
      return null;
    }
    return {
      values: sanitizeValues(draft.values),
      step: Math.min(Math.max(Number(draft.step) || 1, 1), TOTAL_STEPS),
      maxReached: Math.min(Math.max(Number(draft.maxReached) || 1, 1), TOTAL_STEPS),
    };
  } catch {
    return null;
  }
}

export function saveDraft({ values, step, maxReached }, storage = globalThis.localStorage) {
  try {
    const { website, consentimento, ...rest } = values;
    storage?.setItem(DRAFT_KEY, JSON.stringify({ values: rest, step, maxReached, savedAt: Date.now() }));
  } catch {
    /* modo privado / armazenamento cheio: segue sem rascunho */
  }
}

export function clearDraft(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(DRAFT_KEY);
  } catch {
    /* ignora */
  }
}

export function hasMeaningfulDraft(values) {
  return Boolean(values.nome || values.whatsapp || values.ambientesSelecionados.length);
}

/* ─────────────────────────── Arquivos ─────────────────────────── */

const EXTENSION_MIME = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

/** Alguns navegadores não informam o tipo de arquivos HEIC: deduz pela extensão. */
export function resolveMimeType(file) {
  if (file?.type) return file.type;
  const ext = String(file?.name ?? "").split(".").pop()?.toLowerCase();
  return EXTENSION_MIME[ext] ?? "";
}

/** Valida a lista de arquivos escolhidos. Retorna { accepted, rejected: [{ name, reason }] }. */
export function validateFiles(existing, incoming) {
  const accepted = [];
  const rejected = [];
  const room = ATTACHMENT_RULES.maxFiles - existing.length;
  for (const file of incoming) {
    const type = resolveMimeType(file);
    if (accepted.length >= room) {
      rejected.push({ name: file.name, reason: `limite de ${ATTACHMENT_RULES.maxFiles} arquivos` });
    } else if (!ATTACHMENT_RULES.mimeTypes.includes(type)) {
      rejected.push({ name: file.name, reason: "formato não aceito (use PDF, JPG, PNG, WebP ou HEIC)" });
    } else if (file.size > ATTACHMENT_RULES.maxSizeBytes) {
      rejected.push({ name: file.name, reason: "acima de 25 MB" });
    } else if (file.size === 0) {
      rejected.push({ name: file.name, reason: "arquivo vazio" });
    } else if (existing.some((item) => item.name === file.name && item.size === file.size)) {
      rejected.push({ name: file.name, reason: "já adicionado" });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}
