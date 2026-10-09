import { mediaUrl, PUBLIC_MEDIA_BUCKET } from "../../utils/image-url.js";
import { safeFileName, validateMediaFile } from "./media.schema.js";

function unwrap({ data, error }, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}

export function withMediaUrl(media) {
  return media ? { ...media, public_url: mediaUrl(media) } : media;
}

/** Valor que vai para projects.cover_image / gallery.src / site_settings.hero_image. */
export function mediaSource(media) {
  return media.path || media.url;
}

export async function listMedia(db, { limit = 300 } = {}) {
  return unwrap(
    await db.from("media").select("*").order("created_at", { ascending: false }).limit(limit),
    "Erro ao listar mídias",
  ).map(withMediaUrl);
}

/**
 * Sobe uma imagem para o bucket público e registra na biblioteca.
 * No modo demo a imagem vira data URL em memória (limite menor).
 */
export async function uploadMedia(db, file, { alt = "" } = {}) {
  const demo = Boolean(db.isDemo);
  const problem = validateMediaFile(file, { demo });
  if (problem) return { data: null, error: { message: problem } };

  if (demo) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const { data, error } = await db
      .from("media")
      .insert({
        url: `data:${file.type};base64,${base64}`,
        alt,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select("*")
      .single();
    return { data: withMediaUrl(data), error };
  }

  const now = new Date();
  const folder = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const path = `${folder}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`;

  const upload = await db.storage.from(PUBLIC_MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) return { data: null, error: { message: `Falha no upload: ${upload.error.message}` } };

  const { data, error } = await db
    .from("media")
    .insert({ bucket: PUBLIC_MEDIA_BUCKET, path, alt, mime_type: file.type, size_bytes: file.size })
    .select("*")
    .single();

  if (error) {
    // Não deixa arquivo órfão no storage se o registro falhar.
    await db.storage.from(PUBLIC_MEDIA_BUCKET).remove([path]);
    return { data: null, error };
  }
  return { data: withMediaUrl(data), error: null };
}

export async function updateMediaAlt(db, id, alt) {
  return db.from("media").update({ alt }).eq("id", id);
}

/** Onde a mídia está sendo usada (impede apagar imagem em uso). */
export async function findMediaUsage(db, media) {
  const source = mediaSource(media);
  const usage = [];

  const projects = unwrap(
    await db.from("projects").select("id, title, cover_image, gallery"),
    "Erro ao verificar uso da mídia",
  );
  for (const project of projects) {
    const inGallery = (project.gallery ?? []).some((item) => item.src === source);
    if (project.cover_image === source || inGallery) usage.push(`Projeto “${project.title}”`);
  }

  const settings = unwrap(
    await db.from("site_settings").select("hero_image").eq("id", 1).maybeSingle(),
    "Erro ao verificar uso da mídia",
  );
  if (settings?.hero_image === source) usage.push("Imagem de destaque da página inicial");

  return usage;
}

export async function deleteMedia(db, id) {
  const media = unwrap(await db.from("media").select("*").eq("id", id).maybeSingle(), "Erro ao carregar mídia");
  if (!media) return { error: { message: "Mídia não encontrada" } };

  const usage = await findMediaUsage(db, media);
  if (usage.length) {
    return { error: { message: `Esta imagem está em uso: ${usage.join(", ")}. Troque antes de excluir.` } };
  }

  if (media.path) {
    const removal = await db.storage.from(media.bucket || PUBLIC_MEDIA_BUCKET).remove([media.path]);
    if (removal.error) return { error: { message: `Falha ao remover o arquivo: ${removal.error.message}` } };
  }
  const { error } = await db.from("media").delete().eq("id", id);
  return { error };
}
