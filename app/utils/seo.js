/**
 * Monta as meta tags de uma rota a partir das configurações do site (root loader).
 * Uso:  export const meta = ({ matches }) => buildMeta(matches, { title: "Projetos" });
 */
export function getRootData(matches) {
  return matches?.find((match) => match?.id === "root")?.data ?? null;
}

function absoluteUrl(siteUrl, path) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl ?? ""}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * @param {Array} matches
 * @param {{ title?: string, description?: string, image?: string, path?: string, noindex?: boolean, type?: string }} page
 */
export function buildMeta(matches, page = {}) {
  const root = getRootData(matches);
  const settings = root?.settings ?? {};
  const siteUrl = root?.env?.SITE_URL ?? "";
  const studio = settings.studio_name || "Estúdio";

  const title = page.title ? `${page.title} — ${studio}` : settings.seo_title || studio;
  const description = page.description || settings.seo_description || settings.tagline || "";
  const image = absoluteUrl(siteUrl, page.image || settings.hero_image);
  const url = page.path ? absoluteUrl(siteUrl, page.path) : undefined;

  const tags = [
    { title },
    { name: "description", content: description },
    { property: "og:site_name", content: studio },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: page.type || "website" },
    { property: "og:locale", content: "pt_BR" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
  ];
  if (image) tags.push({ property: "og:image", content: image });
  if (url) {
    tags.push({ property: "og:url", content: url });
    tags.push({ tagName: "link", rel: "canonical", href: url });
  }
  if (page.noindex) tags.push({ name: "robots", content: "noindex, nofollow" });
  return tags;
}
