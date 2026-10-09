/**
 * Upload dos anexos do briefing direto do navegador para o Storage
 * (bucket privado `briefing-uploads`). A política do bucket só permite
 * INSERIR — ninguém lista nem baixa sem ser admin.
 */
import { getBrowserSupabase } from "../../../lib/supabase.browser.js";
import { safeFileName } from "../../media/media.schema.js";
import { resolveMimeType } from "./briefing.state.js";

export const BRIEFING_BUCKET = "briefing-uploads";

/**
 * Caminho determinístico por arquivo (usa o id do item, não a posição):
 * reenviar após falha não duplica, e remover um arquivo da lista não faz
 * outro "herdar" o caminho de um upload anterior.
 */
export function attachmentPath(submissionId, itemId, fileName) {
  const key = String(itemId).replace(/[^a-z0-9]/gi, "").slice(0, 8) || "arquivo";
  return `${submissionId}/${key}-${safeFileName(fileName)}`;
}

/** Metadados que vão no payload do briefing (validado pelo zod). */
export function describeAttachments(files, submissionId) {
  return files.map((item) => ({
    path: attachmentPath(submissionId, item.id, item.file.name),
    name: item.file.name.slice(0, 200),
    size: item.file.size,
    type: resolveMimeType(item.file),
  }));
}

/**
 * @param {{ id: string, file: File }[]} files
 * @param {string} submissionId
 * @param {(id: string, status: "uploading" | "done" | "error", message?: string) => void} [onStatus]
 * @returns {Promise<{ uploaded: boolean }>}  uploaded=false no modo demonstração
 */
export async function uploadBriefingFiles(files, submissionId, onStatus) {
  const supabase = getBrowserSupabase();
  if (!supabase || files.length === 0) return { uploaded: false };

  const attachments = describeAttachments(files, submissionId);
  for (const [index, item] of files.entries()) {
    const { path, type } = attachments[index];
    onStatus?.(item.id, "uploading");
    const { error } = await supabase.storage.from(BRIEFING_BUCKET).upload(path, item.file, {
      contentType: type,
      cacheControl: "3600",
      upsert: false,
    });
    // Repetição após falha parcial: o arquivo já está lá, tudo certo.
    const alreadyExists = error && (String(error.statusCode) === "409" || /exist/i.test(error.message ?? ""));
    if (error && !alreadyExists) {
      onStatus?.(item.id, "error", error.message);
      throw new Error(`Não foi possível enviar “${item.file.name}”. Verifique a conexão e tente novamente.`);
    }
    onStatus?.(item.id, "done");
  }
  return { uploaded: true };
}
