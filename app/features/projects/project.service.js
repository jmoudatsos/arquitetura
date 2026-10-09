import { imageUrl } from "../../utils/image-url.js";

/** Lança erro (vira 500 no ErrorBoundary) quando uma LEITURA falha. */
function unwrap({ data, error }, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}

/** Acrescenta URLs prontas para <img> (capa e galeria). */
export function withProjectUrls(project) {
  if (!project) return project;
  return {
    ...project,
    cover_url: imageUrl(project.cover_image),
    gallery: (project.gallery ?? []).map((item) => ({ ...item, url: imageUrl(item.src) })),
  };
}

const PUBLIC_COLUMNS =
  "id, slug, title, subtitle, summary, description, category, style, location, year, area_m2, materials, cover_image, cover_alt, gallery, featured, sort_order, published_at, seo_title, seo_description";

/* ─────────────────────────── Leituras públicas ─────────────────────────── */

export async function listPublishedProjects(db, { category, limit } = {}) {
  let query = db
    .from("projects")
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });
  if (category) query = query.eq("category", category);
  if (limit) query = query.limit(limit);
  return unwrap(await query, "Erro ao listar projetos").map(withProjectUrls);
}

export async function listFeaturedProjects(db, limit = 4) {
  const featured = unwrap(
    await db
      .from("projects")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .eq("featured", true)
      .order("sort_order", { ascending: true })
      .limit(limit),
    "Erro ao listar destaques",
  );
  if (featured.length >= limit) return featured.map(withProjectUrls);

  // Completa com os mais recentes quando há poucos destaques marcados.
  const others = await listPublishedProjects(db, { limit: limit * 2 });
  const ids = new Set(featured.map((p) => p.id));
  return [...featured.map(withProjectUrls), ...others.filter((p) => !ids.has(p.id))].slice(0, limit);
}

/** Projeto publicado + vizinhos (anterior/próximo) na ordem do portfólio. */
export async function getPublishedProjectBySlug(db, slug) {
  const project = unwrap(
    await db.from("projects").select(PUBLIC_COLUMNS).eq("status", "published").eq("slug", slug).maybeSingle(),
    "Erro ao carregar o projeto",
  );
  if (!project) return null;

  const all = unwrap(
    await db
      .from("projects")
      .select("slug, title, sort_order, published_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false }),
    "Erro ao carregar a navegação",
  );
  const index = all.findIndex((p) => p.slug === slug);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  return { project: withProjectUrls(project), previous, next };
}

/* ─────────────────────────── Admin ─────────────────────────── */

export async function listAllProjects(db) {
  return unwrap(
    await db
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    "Erro ao listar projetos",
  ).map(withProjectUrls);
}

export async function getProjectById(db, id) {
  const data = unwrap(await db.from("projects").select("*").eq("id", id).maybeSingle(), "Erro ao carregar o projeto");
  return data ? withProjectUrls(data) : null;
}

/** Valores validados do formulário → linha da tabela (vazio vira null). */
export function toProjectRow(values) {
  const blankToNull = (value) => (value === "" || value === undefined ? null : value);
  return {
    title: values.title,
    slug: values.slug,
    subtitle: blankToNull(values.subtitle),
    summary: blankToNull(values.summary),
    description: blankToNull(values.description),
    category: values.category,
    style: blankToNull(values.style),
    location: blankToNull(values.location),
    year: values.year ?? null,
    area_m2: values.area_m2 ?? null,
    materials: values.materials ?? [],
    cover_image: blankToNull(values.cover_image),
    cover_alt: blankToNull(values.cover_alt),
    gallery: (values.gallery ?? []).map(({ src, alt, caption }) => ({ src, alt: alt ?? "", caption: caption ?? "" })),
    status: values.status,
    featured: Boolean(values.featured),
    sort_order: values.sort_order ?? 0,
    seo_title: blankToNull(values.seo_title),
    seo_description: blankToNull(values.seo_description),
  };
}

/** Erros de banco → mensagens amigáveis por campo. */
export function projectDbErrorToFieldErrors(error) {
  if (!error) return {};
  if (error.code === "23505" && /slug/.test(`${error.message} ${error.details ?? ""}`)) {
    return { slug: "Já existe um projeto com este endereço. Escolha outro slug." };
  }
  if (error.code === "42501") return { _form: "Sem permissão para salvar. Entre novamente como administrador." };
  return { _form: `Não foi possível salvar: ${error.message}` };
}

export async function createProject(db, values) {
  const row = { ...toProjectRow(values), is_sample: false };
  const { data, error } = await db.from("projects").insert(row).select("*").single();
  return { data, error };
}

export async function updateProject(db, id, values) {
  // Ao editar um projeto de exemplo, ele deixa de ser "exemplo".
  const row = { ...toProjectRow(values), is_sample: false };
  const { data, error } = await db.from("projects").update(row).eq("id", id).select("*").single();
  return { data, error };
}

export async function setProjectStatus(db, id, status) {
  const { error } = await db.from("projects").update({ status }).eq("id", id);
  return { error };
}

export async function setProjectFeatured(db, id, featured) {
  const { error } = await db.from("projects").update({ featured }).eq("id", id);
  return { error };
}

export async function deleteProject(db, id) {
  const { error } = await db.from("projects").delete().eq("id", id);
  return { error };
}

export async function countSampleProjects(db) {
  const { count, error } = await db
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("is_sample", true)
    .eq("status", "published");
  if (error) return 0;
  return count ?? 0;
}
