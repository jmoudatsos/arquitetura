/**
 * Resolve a origem de uma imagem para uma URL utilizável em <img src>.
 *
 *  • "https://…", "//…", "data:", "blob:" → como está
 *  • "/images/…"                          → arquivo local em /public
 *  • "projetos/abc.webp"                  → objeto do bucket público `site-media`
 *
 * Funciona no servidor e no navegador (mesmo resultado → sem erro de hidratação).
 */
export const PUBLIC_MEDIA_BUCKET = "site-media";

function readSupabaseUrl() {
  if (typeof window !== "undefined") {
    return String(window.__ENV?.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  }
  // Mesma regra do env.server.js: só vale com URL + chave pública e sem modo demo forçado.
  const env = globalThis.process?.env ?? {};
  const url = String(env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = String(env.SUPABASE_ANON_KEY ?? "").trim();
  const forced = ["1", "true", "yes"].includes(String(env.FORCE_DEMO_MODE ?? "").trim().toLowerCase());
  return url && key && !forced && !url.includes("SEU-PROJETO") ? url : "";
}

export function isAbsoluteSource(src) {
  return /^(https?:)?\/\//i.test(src) || /^(data|blob):/i.test(src);
}

export function storagePublicUrl(path, { supabaseUrl = readSupabaseUrl(), bucket = PUBLIC_MEDIA_BUCKET } = {}) {
  const cleanPath = String(path).replace(/^\/+/, "");
  const encoded = cleanPath.split("/").map(encodeURIComponent).join("/");
  if (!supabaseUrl) return `/${encoded}`;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encoded}`;
}

/**
 * @param {string | null | undefined} src
 * @param {{ supabaseUrl?: string, bucket?: string }} [options]
 * @returns {string | null}
 */
export function imageUrl(src, options = {}) {
  if (!src || typeof src !== "string") return null;
  const value = src.trim();
  if (!value) return null;
  if (isAbsoluteSource(value) || value.startsWith("/")) return value;
  return storagePublicUrl(value, options);
}

/** URL da mídia da biblioteca (linha da tabela `media`). */
export function mediaUrl(media, options = {}) {
  if (!media) return null;
  return imageUrl(media.url || media.path, { ...options, bucket: media.bucket || PUBLIC_MEDIA_BUCKET });
}
