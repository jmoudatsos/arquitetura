import { z } from "zod";
import { STYLE_PRESETS } from "../leads/briefing.options.js";
import { checkbox, toList } from "../../utils/form-data.js";
import { SLUG_PATTERN } from "../../utils/slugify.js";

export const PROJECT_CATEGORIES = [
  { id: "cozinha", label: "Cozinhas", room: "cozinha" },
  { id: "quarto", label: "Quartos & closets", room: "quarto" },
  { id: "living", label: "Livings", room: "living" },
  { id: "office", label: "Home office", room: "office" },
  { id: "banheiro", label: "Banheiros", room: "banheiro" },
  { id: "gourmet", label: "Gourmet & varandas", room: "gourmet" },
  { id: "comercial", label: "Comercial", room: null },
  { id: "outro", label: "Outros", room: null },
];

export const PROJECT_CATEGORY_IDS = PROJECT_CATEGORIES.map((c) => c.id);

export const PROJECT_STATUSES = [
  { id: "draft", label: "Rascunho" },
  { id: "published", label: "Publicado" },
];

export function getCategory(id) {
  return PROJECT_CATEGORIES.find((c) => c.id === id) ?? null;
}

export function getStyleTitle(id) {
  return STYLE_PRESETS.find((s) => s.id === id)?.title ?? "";
}

const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label}: máximo de ${max} caracteres`)
    .default("");

const optionalNumber = (schema) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : normalized; // texto inválido → erro do zod
  }, schema.nullable());

export const galleryItemSchema = z.object({
  src: z.string().trim().min(1, "Imagem sem origem").max(500),
  alt: z.string().trim().max(200).default(""),
  caption: z.string().trim().max(200).default(""),
});

export const projectSchema = z.object({
  title: z.string().trim().min(2, "Informe o título").max(140, "Título muito longo"),
  slug: z
    .string()
    .trim()
    .min(2, "Informe o endereço (slug)")
    .max(80, "Slug muito longo")
    .regex(SLUG_PATTERN, "Use só letras minúsculas, números e hífens (ex.: cozinha-nogueira)"),
  subtitle: optionalText(140, "Subtítulo"),
  summary: optionalText(400, "Resumo"),
  description: optionalText(8000, "Descrição"),
  category: z.enum(PROJECT_CATEGORY_IDS, { errorMap: () => ({ message: "Escolha uma categoria" }) }),
  style: z
    .union([z.literal(""), z.enum(STYLE_PRESETS.map((s) => s.id))])
    .default(""),
  location: optionalText(120, "Local"),
  year: optionalNumber(
    z.number({ invalid_type_error: "Ano inválido" }).int("Ano inválido").min(1950, "Ano inválido").max(2100, "Ano inválido"),
  ),
  area_m2: optionalNumber(
    z.number({ invalid_type_error: "Área inválida" }).positive("A área deve ser maior que zero").max(100000, "Área inválida"),
  ),
  materials: z.preprocess(
    toList,
    z.array(z.string().max(80, "Material muito longo")).max(20, "Máximo de 20 materiais"),
  ),
  cover_image: optionalText(500, "Capa"),
  cover_alt: optionalText(200, "Descrição da capa"),
  gallery: z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || value.trim() === "") return [];
    try {
      return JSON.parse(value);
    } catch {
      return "invalid";
    }
  }, z.array(galleryItemSchema, { invalid_type_error: "Galeria inválida" }).max(30, "Máximo de 30 imagens")),
  status: z.enum(["draft", "published"], { errorMap: () => ({ message: "Status inválido" }) }),
  featured: z.preprocess(checkbox, z.boolean()),
  sort_order: z.preprocess(
    (value) => (value === "" || value == null ? 0 : Number(value)),
    z.number({ invalid_type_error: "Ordem inválida" }).int("Use um número inteiro").min(-9999).max(9999),
  ),
  seo_title: optionalText(70, "Título SEO"),
  seo_description: optionalText(200, "Descrição SEO"),
});
