import { z } from "zod";
import { checkbox, toList } from "../../utils/form-data.js";
import { SLUG_PATTERN } from "../../utils/slugify.js";

/** Ícones disponíveis para serviços (nomes mapeados para lucide-react em service.components.jsx). */
export const SERVICE_ICONS = [
  { id: "ruler", label: "Régua" },
  { id: "compass", label: "Compasso" },
  { id: "utensils", label: "Cozinha" },
  { id: "shirt", label: "Closet" },
  { id: "layers", label: "Camadas / 3D" },
  { id: "hammer", label: "Montagem" },
  { id: "sofa", label: "Living" },
  { id: "lamp", label: "Iluminação" },
  { id: "bath", label: "Banheiro" },
  { id: "briefcase", label: "Escritório" },
  { id: "flame", label: "Gourmet" },
  { id: "sparkles", label: "Acabamento" },
];

export const serviceSchema = z.object({
  title: z.string().trim().min(2, "Informe o título").max(100, "Título muito longo"),
  slug: z
    .string()
    .trim()
    .min(2, "Informe o slug")
    .max(80)
    .regex(SLUG_PATTERN, "Use só letras minúsculas, números e hífens"),
  summary: z.string().trim().max(300, "Resumo: máximo de 300 caracteres").default(""),
  description: z.string().trim().max(2000, "Descrição: máximo de 2000 caracteres").default(""),
  icon: z.enum(SERVICE_ICONS.map((icon) => icon.id), { errorMap: () => ({ message: "Ícone inválido" }) }),
  features: z.preprocess(
    toList,
    z.array(z.string().max(120, "Item muito longo")).max(12, "Máximo de 12 itens"),
  ),
  sort_order: z.preprocess(
    (value) => (value === "" || value == null ? 0 : Number(value)),
    z.number({ invalid_type_error: "Ordem inválida" }).int().min(-9999).max(9999),
  ),
  is_active: z.preprocess(checkbox, z.boolean()),
});
