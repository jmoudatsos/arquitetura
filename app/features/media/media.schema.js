import { z } from "zod";

export const MEDIA_RULES = {
  mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
  accept: ".jpg,.jpeg,.png,.webp,.avif,.gif",
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB (limite do bucket site-media)
  demoMaxSizeBytes: 3 * 1024 * 1024, // no modo demo a imagem fica na memória do servidor
  maxFilesPerUpload: 12,
};

export const mediaAltSchema = z.object({
  alt: z.string().trim().max(200, "Descrição: máximo de 200 caracteres").default(""),
});

/** Valida um File recebido via FormData. Retorna mensagem de erro ou null. */
export function validateMediaFile(file, { demo = false } = {}) {
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return "Arquivo inválido";
  if (!file.size) return `"${file.name}" está vazio`;
  if (!MEDIA_RULES.mimeTypes.includes(file.type)) return `"${file.name}": formato não aceito (use JPG, PNG, WebP, AVIF ou GIF)`;
  const max = demo ? MEDIA_RULES.demoMaxSizeBytes : MEDIA_RULES.maxSizeBytes;
  if (file.size > max) return `"${file.name}" passa de ${Math.round(max / 1024 / 1024)} MB`;
  return null;
}

/** "Foto Cozinha (1).JPG" → "foto-cozinha-1.jpg" */
export function safeFileName(name) {
  const base = String(name ?? "arquivo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";
  const ext = dot > 0 ? base.slice(dot + 1).replace(/[^a-z0-9]/g, "") : "";
  return `${stem.slice(0, 80)}${ext ? `.${ext.slice(0, 5)}` : ""}`;
}
