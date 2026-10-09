/**
 * Contrato de validação do briefing (zod).
 *
 * Usado em 3 lugares — por isso é puro e só depende de `zod` e das opções:
 *   1. no navegador, para validar cada etapa do assistente;
 *   2. na action da rota /briefing (servidor React Router);
 *   3. na Edge Function `create-lead` (cópia sincronizada em supabase/functions/_shared).
 *
 * Depois de editar: `npm run sync:contracts`.
 */
import { z } from "zod";
import {
  ATTACHMENT_RULES,
  BUDGET_RANGES,
  MATERIALS,
  MAX_REFERENCE_LINKS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  ROOM_IDS,
  ROOM_QUESTIONS,
  START_FORECASTS,
  STYLE_IDS,
} from "./briefing.options.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function phoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function enumOf(values, message) {
  return z.enum(values, { errorMap: () => ({ message }) });
}

function optionalText(max, label = "Texto") {
  return z
    .string()
    .trim()
    .max(max, `${label} muito longo (máx. ${max} caracteres)`)
    .default("");
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/* ───────────────────────── Etapa 1 — Sobre você ───────────────────────── */

export const whatsappSchema = z
  .string({ required_error: "Informe seu WhatsApp" })
  .trim()
  .refine(
    (value) => {
      // Mesma normalização do lead.mapper (zeros à esquerda saem) → bate com o CHECK do banco.
      const digits = phoneDigits(value).replace(/^0+/, "");
      return digits.length >= 10 && digits.length <= 15;
    },
    { message: "Informe um WhatsApp válido com DDD" },
  );

export const emailSchema = z
  .string()
  .trim()
  .max(160, "E-mail muito longo")
  .default("")
  .refine((value) => value === "" || EMAIL_RE.test(value), { message: "E-mail inválido" });

export const aboutSchema = z.object({
  nome: z
    .string({ required_error: "Informe seu nome" })
    .trim()
    .min(3, "Informe seu nome completo")
    .max(120, "Nome muito longo"),
  whatsapp: whatsappSchema,
  email: emailSchema,
  cidade: optionalText(120, "Cidade"),
  tipoImovel: enumOf(PROPERTY_TYPES, "Selecione o tipo de imóvel"),
  statusImovel: enumOf(PROPERTY_STATUSES, "Selecione o momento do espaço"),
  previsaoInicio: enumOf(START_FORECASTS, "Selecione a previsão de início"),
  investimentoPrevisto: enumOf(BUDGET_RANGES, "Selecione uma faixa de investimento"),
});

/* ───────────────────────── Etapa 2 — Ambientes ───────────────────────── */

export const roomsSchema = z.object({
  ambientesSelecionados: z
    .array(enumOf(ROOM_IDS, "Ambiente inválido"), {
      required_error: "Selecione ao menos um ambiente",
    })
    .min(1, "Selecione ao menos um ambiente para prosseguir")
    .refine((list) => new Set(list).size === list.length, {
      message: "Ambientes repetidos",
    }),
});

/* ──────────────────── Etapa 3 — Detalhes por ambiente ──────────────────── */

function questionSchema(question) {
  switch (question.type) {
    case "single":
      return enumOf(question.options, `Opção inválida em "${question.label}"`).optional();
    case "multi":
      return z
        .array(enumOf(question.options, `Opção inválida em "${question.label}"`))
        .max(question.options.length)
        .refine((list) => new Set(list).size === list.length, { message: "Opções repetidas" })
        .default([]);
    case "matrix":
      return z
        .object(
          Object.fromEntries(
            question.rows.map((row) => [
              row.id,
              enumOf(question.options, `Opção inválida em "${row.label}"`).optional(),
            ]),
          ),
        )
        .strict()
        .default({});
    case "text":
      return optionalText(1500, question.label);
    default:
      throw new Error(`Tipo de pergunta desconhecido: ${question.type}`);
  }
}

export const roomDetailSchemas = Object.fromEntries(
  ROOM_IDS.map((roomId) => [
    roomId,
    z
      .object(
        Object.fromEntries(
          (ROOM_QUESTIONS[roomId] ?? []).map((question) => [question.id, questionSchema(question)]),
        ),
      )
      .strict(),
  ]),
);

export const roomDetailsSchema = z
  .object(
    Object.fromEntries(ROOM_IDS.map((roomId) => [roomId, roomDetailSchemas[roomId].optional()])),
  )
  .strict()
  .default({});

/* ───────────────────── Etapa 4 — Estilo, materiais e anexos ───────────────────── */

export const attachmentSchema = z.object({
  path: z
    .string()
    .max(300)
    .regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,200}$/i, "Caminho de anexo inválido"),
  name: z.string().trim().min(1).max(200),
  size: z
    .number()
    .int()
    .positive()
    .max(ATTACHMENT_RULES.maxSizeBytes, "Arquivo acima do limite de 25 MB"),
  type: enumOf(ATTACHMENT_RULES.mimeTypes, "Formato de arquivo não aceito"),
});

export const styleSchema = z.object({
  estiloPrincipal: z.union([z.literal(""), enumOf(STYLE_IDS, "Estilo inválido")]).default(""),
  materiaisGostados: z
    .array(enumOf(MATERIALS, "Material inválido"))
    .max(MATERIALS.length)
    .refine((list) => new Set(list).size === list.length, { message: "Materiais repetidos" })
    .default([]),
  referencias: z
    .array(
      z
        .string()
        .trim()
        .max(500, "Link muito longo")
        .refine(isHttpUrl, { message: "Cole um link completo (https://…)" }),
    )
    .max(MAX_REFERENCE_LINKS, `Máximo de ${MAX_REFERENCE_LINKS} links`)
    .default([]),
  anexos: z
    .array(attachmentSchema)
    .max(ATTACHMENT_RULES.maxFiles, `Máximo de ${ATTACHMENT_RULES.maxFiles} arquivos`)
    .default([]),
});

/* ───────────────────────── Etapa 5 — Revisão ───────────────────────── */

export const reviewSchema = z.object({
  observacoesFinais: optionalText(4000, "Observação"),
  consentimento: z.literal(true, {
    errorMap: () => ({
      message: "Precisamos da sua autorização para usar os dados na elaboração da proposta",
    }),
  }),
});

/* ───────────────────────── Metadados do envio ───────────────────────── */

const utmValue = z.string().trim().max(120).optional();

export const metaSchema = z.object({
  submissionId: z.string().regex(UUID_RE, "Identificador de envio inválido"),
  origem: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9_-]*$/, "Origem inválida")
    .default("briefing"),
  utm: z
    .object({
      utm_source: utmValue,
      utm_medium: utmValue,
      utm_campaign: utmValue,
      utm_term: utmValue,
      utm_content: utmValue,
    })
    .strict()
    .default({}),
  // Honeypot anti-spam: humanos nunca veem este campo, então ele deve chegar vazio.
  website: z.string().max(200).default(""),
});

/* ───────────────────────── Esquema completo ───────────────────────── */

export const briefingSchema = aboutSchema
  .merge(roomsSchema)
  .merge(z.object({ detalhesAmbientes: roomDetailsSchema }))
  .merge(styleSchema)
  .merge(reviewSchema)
  .merge(metaSchema)
  .superRefine((data, ctx) => {
    data.anexos.forEach((attachment, index) => {
      if (!attachment.path.startsWith(`${data.submissionId}/`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["anexos", index, "path"],
          message: "Anexo não pertence a este envio",
        });
      }
    });
  })
  .transform((data) => ({
    ...data,
    // Respostas de ambientes desmarcados depois de preenchidos são descartadas.
    detalhesAmbientes: Object.fromEntries(
      Object.entries(data.detalhesAmbientes).filter(([roomId]) =>
        data.ambientesSelecionados.includes(roomId),
      ),
    ),
  }));

/* ───────────────────────── Utilitários ───────────────────────── */

/** Esquemas usados para validar cada etapa do assistente no navegador. */
export const STEP_SCHEMAS = {
  1: aboutSchema,
  2: roomsSchema,
  3: z.object({ detalhesAmbientes: roomDetailsSchema }),
  4: styleSchema.omit({ anexos: true }),
  5: reviewSchema,
};

const FIELD_STEPS = {
  nome: 1,
  whatsapp: 1,
  email: 1,
  cidade: 1,
  tipoImovel: 1,
  statusImovel: 1,
  previsaoInicio: 1,
  investimentoPrevisto: 1,
  ambientesSelecionados: 2,
  detalhesAmbientes: 3,
  estiloPrincipal: 4,
  materiaisGostados: 4,
  referencias: 4,
  anexos: 4,
  observacoesFinais: 5,
  consentimento: 5,
};

/** Em qual etapa do assistente está o campo com erro (ex.: "detalhesAmbientes.cozinha.layout" → 3). */
export function stepForPath(path) {
  const root = String(path).split(".")[0];
  return FIELD_STEPS[root] ?? 5;
}

/** Converte um ZodError em { "caminho.do.campo": "mensagem" } (primeira mensagem de cada campo). */
export function issuesToFieldErrors(error) {
  const fieldErrors = {};
  for (const issue of error?.issues ?? []) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Valida uma etapa isolada. Retorna {} quando está tudo certo. */
export function validateStep(step, values) {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return {};
  const result = schema.safeParse(values);
  return result.success ? {} : issuesToFieldErrors(result.error);
}
