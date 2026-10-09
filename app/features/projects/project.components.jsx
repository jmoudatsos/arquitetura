import { ArrowDown, ArrowUp, ArrowUpRight, ImagePlus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Form, Link, NavLink } from "react-router";
import { Figure } from "../../components/shared/Blocks.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { ChoicePill } from "../../components/ui/Choice.jsx";
import { CheckboxField, SelectField, TextAreaField, TextField } from "../../components/ui/Field.jsx";
import { Alert } from "../../components/ui/Feedback.jsx";
import { Card } from "../../components/ui/Layout.jsx";
import { cn } from "../../utils/cn.js";
import { imageUrl } from "../../utils/image-url.js";
import { slugify } from "../../utils/slugify.js";
import { STYLE_PRESETS } from "../leads/briefing.options.js";
import { MediaPickerDialog, mediaSourceOf, MediaThumb } from "../media/media.components.jsx";
import { getCategory, getStyleTitle, PROJECT_CATEGORIES } from "./project.schema.js";

/* ════════════════════════════ PÚBLICO ════════════════════════════ */

export function ProjectMetaLine({ project, className }) {
  const parts = [getCategory(project.category)?.label, project.location, project.year].filter(Boolean);
  return <p className={cn("eyebrow text-faint", className)}>{parts.join(" · ")}</p>;
}

export function ProjectCard({
  project,
  ratio = "aspect-[4/3]",
  sizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  priority = false,
  headingLevel: Heading = "h3",
  className,
}) {
  return (
    <article className={cn("group flex flex-col", className)}>
      <Link to={`/projetos/${project.slug}`} className="flex h-full flex-col rounded-xs" prefetch="intent">
        <Figure
          src={project.cover_url}
          alt={project.cover_alt || project.title}
          ratio={ratio}
          priority={priority}
          sizes={sizes}
          imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.035]"
        >
          <span className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent opacity-80" aria-hidden="true" />
          <span
            className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full border border-bone/30 bg-ink/50 text-bone opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </Figure>
        <div className="pt-5">
          <ProjectMetaLine project={project} />
          <Heading className="mt-2 text-[1.625rem] leading-tight text-bone transition-colors group-hover:text-caramel">
            {project.title}
          </Heading>
          {project.summary && <p className="mt-2 line-clamp-2 text-[1.0625rem] text-mute">{project.summary}</p>}
        </div>
      </Link>
    </article>
  );
}

/** Filtro por categoria via links (?categoria=) — funciona sem JavaScript. */
export function CategoryFilter({ categories, active }) {
  const linkClass = (isActive) =>
    cn(
      "inline-flex min-h-10 items-center rounded-full border px-4 text-[0.9375rem] font-semibold tracking-[0.08em] transition-colors",
      isActive ? "border-walnut bg-walnut text-ink" : "border-line text-mute hover:border-field hover:text-bone",
    );
  return (
    <nav aria-label="Filtrar por categoria">
      <ul className="flex flex-wrap gap-2">
        <li>
          <NavLink to="/projetos" end className={() => linkClass(!active)} aria-current={!active ? "page" : undefined}>
            Todos
          </NavLink>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              to={`/projetos?categoria=${category.id}`}
              className={linkClass(active === category.id)}
              aria-current={active === category.id ? "page" : undefined}
              preventScrollReset
            >
              {category.label}
              <span className="ml-2 text-[0.8125rem] opacity-70">{category.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ProjectFacts({ project }) {
  const facts = [
    ["Categoria", getCategory(project.category)?.label],
    ["Local", project.location],
    ["Ano", project.year],
    ["Área", project.area_m2 ? `${String(project.area_m2).replace(".", ",")} m²` : null],
    ["Estilo", getStyleTitle(project.style)],
  ].filter(([, value]) => value);

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-1">
      {facts.map(([label, value]) => (
        <div key={label} className="border-t border-line pt-3">
          <dt className="eyebrow text-faint">{label}</dt>
          <dd className="mt-1.5 text-[1.1875rem] text-bone">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProjectGallery({ items, title }) {
  if (!items?.length) return null;
  return (
    <div className="columns-1 gap-5 sm:columns-2 [&>figure]:mb-5">
      {items.map((item, index) => (
        <figure key={`${item.src}-${index}`} className="break-inside-avoid">
          <img
            src={item.url}
            alt={item.alt || `${title} — imagem ${index + 2}`}
            loading="lazy"
            decoding="async"
            className="img-warm w-full rounded-xs bg-panel"
          />
          {item.caption && <figcaption className="mt-2 text-[0.9375rem] text-faint">{item.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

/* ════════════════════════════ ADMIN ════════════════════════════ */

export const EMPTY_PROJECT = {
  title: "",
  slug: "",
  subtitle: "",
  summary: "",
  description: "",
  category: "cozinha",
  style: "",
  location: "",
  year: "",
  area_m2: "",
  materials: [],
  cover_image: "",
  cover_alt: "",
  gallery: [],
  status: "draft",
  featured: false,
  sort_order: 0,
  seo_title: "",
  seo_description: "",
};

function GalleryEditor({ items, onChange, onAdd }) {
  const move = (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const update = (index, patch) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-mute">Nenhuma imagem na galeria ainda.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={`${item.src}-${index}`} className="flex gap-4 rounded-sm border border-line bg-ink p-3">
              <MediaThumb src={imageUrl(item.src)} className="aspect-[4/3] w-28 shrink-0" />
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <TextField
                  label="Descrição (alt)"
                  value={item.alt ?? ""}
                  onChange={(event) => update(index, { alt: event.target.value })}
                  maxLength={200}
                />
                <TextField
                  label="Legenda"
                  value={item.caption ?? ""}
                  onChange={(event) => update(index, { caption: event.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" className="px-2" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover para cima">
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" className="px-2 hover:text-clay" onClick={() => remove(index)} aria-label="Remover da galeria">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button variant="secondary" size="sm" className="mt-4" onClick={onAdd}>
        <ImagePlus className="size-4" aria-hidden="true" /> Adicionar imagens
      </Button>
    </div>
  );
}

/**
 * Formulário de projeto (novo/editar). Envia para a action da própria rota.
 * @param {{ project?: object, media: any[], errors?: Record<string,string>, submitting?: boolean, submitLabel?: string }} props
 */
export function ProjectForm({ project, media, errors = {}, submitting = false, submitLabel = "Salvar projeto" }) {
  const initial = useMemo(() => ({ ...EMPTY_PROJECT, ...(project ?? {}) }), [project]);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [cover, setCover] = useState(initial.cover_image ?? "");
  const [coverAlt, setCoverAlt] = useState(initial.cover_alt ?? "");
  const [gallery, setGallery] = useState(() => (initial.gallery ?? []).map(({ src, alt, caption }) => ({ src, alt: alt ?? "", caption: caption ?? "" })));
  const [status, setStatus] = useState(initial.status);
  const [picker, setPicker] = useState(null); // "cover" | "gallery" | null

  const generalError = errors._form;

  return (
    <Form method="post" className="grid gap-8 xl:grid-cols-[1fr_22rem]" noValidate>
      <div className="space-y-8">
        {generalError && <Alert tone="error">{generalError}</Alert>}

        <Card className="space-y-6 p-6">
          <h2 className="text-[1.5rem] text-bone">Informações</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Título"
              name="title"
              required
              value={title}
              maxLength={140}
              error={errors.title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
            />
            <TextField
              label="Endereço (slug)"
              name="slug"
              required
              value={slug}
              maxLength={80}
              error={errors.slug}
              hint={slug ? `/projetos/${slug}` : "Gerado a partir do título"}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
            />
          </div>
          <TextField label="Subtítulo" name="subtitle" defaultValue={initial.subtitle ?? ""} maxLength={140} error={errors.subtitle} />
          <TextAreaField
            label="Resumo (aparece nos cards)"
            name="summary"
            rows={2}
            defaultValue={initial.summary ?? ""}
            maxLength={400}
            error={errors.summary}
          />
          <TextAreaField
            label="Descrição completa"
            name="description"
            rows={8}
            defaultValue={initial.description ?? ""}
            maxLength={8000}
            error={errors.description}
            hint="Separe os parágrafos com uma linha em branco."
          />
        </Card>

        <Card className="space-y-6 p-6">
          <h2 className="text-[1.5rem] text-bone">Ficha técnica</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField
              label="Categoria"
              name="category"
              required
              defaultValue={initial.category}
              options={PROJECT_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
              error={errors.category}
            />
            <SelectField
              label="Estilo"
              name="style"
              defaultValue={initial.style ?? ""}
              placeholder="Sem estilo definido"
              options={STYLE_PRESETS.map((s) => ({ value: s.id, label: s.title }))}
              error={errors.style}
            />
            <TextField label="Local" name="location" defaultValue={initial.location ?? ""} maxLength={120} error={errors.location} />
            <div className="grid grid-cols-2 gap-5">
              <TextField label="Ano" name="year" inputMode="numeric" defaultValue={initial.year ?? ""} error={errors.year} />
              <TextField label="Área (m²)" name="area_m2" inputMode="decimal" defaultValue={initial.area_m2 ?? ""} error={errors.area_m2} />
            </div>
          </div>
          <TextAreaField
            label="Materiais"
            name="materials"
            rows={4}
            defaultValue={(initial.materials ?? []).join("\n")}
            error={errors.materials}
            hint="Um por linha (ou separados por vírgula)."
          />
        </Card>

        <Card className="space-y-6 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[1.5rem] text-bone">Imagens</h2>
              <p className="text-mute">A capa aparece nos cards e no topo da página do projeto.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[14rem_1fr]">
            <div>
              <MediaThumb src={imageUrl(cover)} alt="" className="aspect-[4/3] w-full" />
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPicker("cover")}>
                  {cover ? "Trocar capa" : "Escolher capa"}
                </Button>
                {cover && (
                  <Button variant="ghost" size="sm" onClick={() => setCover("")}>
                    Remover
                  </Button>
                )}
              </div>
              {errors.cover_image && <p className="mt-2 text-clay">{errors.cover_image}</p>}
            </div>
            <TextAreaField
              label="Descrição da capa (acessibilidade)"
              name="cover_alt"
              rows={3}
              value={coverAlt}
              onChange={(event) => setCoverAlt(event.target.value)}
              maxLength={200}
              error={errors.cover_alt}
              hint="Descreva a foto para quem usa leitor de tela. Ex.: “Cozinha em nogueira com ilha em pedra”."
            />
          </div>
          <input type="hidden" name="cover_image" value={cover} />

          <div className="border-t border-line pt-6">
            <h3 className="label-caps mb-4 text-mute">Galeria</h3>
            <GalleryEditor items={gallery} onChange={setGallery} onAdd={() => setPicker("gallery")} />
            {errors.gallery && <p className="mt-2 text-clay">{errors.gallery}</p>}
            <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />
          </div>
        </Card>

        <Card className="p-6">
          <details>
            <summary className="cursor-pointer text-[1.25rem] text-bone">SEO (opcional)</summary>
            <div className="mt-5 space-y-5">
              <TextField
                label="Título para buscadores"
                name="seo_title"
                defaultValue={initial.seo_title ?? ""}
                maxLength={70}
                error={errors.seo_title}
                hint="Até 70 caracteres. Vazio = título do projeto."
              />
              <TextAreaField
                label="Descrição para buscadores"
                name="seo_description"
                rows={2}
                defaultValue={initial.seo_description ?? ""}
                maxLength={200}
                error={errors.seo_description}
                hint="Até 200 caracteres. Vazio = resumo."
              />
            </div>
          </details>
        </Card>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card className="space-y-5 p-6">
          <h2 className="text-[1.5rem] text-bone">Publicação</h2>
          <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2">
            <ChoicePill selected={status === "draft"} onSelect={() => setStatus("draft")}>
              Rascunho
            </ChoicePill>
            <ChoicePill selected={status === "published"} onSelect={() => setStatus("published")}>
              Publicado
            </ChoicePill>
          </div>
          <input type="hidden" name="status" value={status} />
          <CheckboxField
            name="featured"
            label="Destacar na página inicial"
            defaultChecked={Boolean(initial.featured)}
          />
          <TextField
            label="Ordem no portfólio"
            name="sort_order"
            type="number"
            defaultValue={initial.sort_order ?? 0}
            error={errors.sort_order}
            hint="Menor aparece primeiro."
          />
          <Button type="submit" className="w-full" loading={submitting}>
            {submitLabel}
          </Button>
          {project?.slug && project.status === "published" && (
            <Link to={`/projetos/${project.slug}`} target="_blank" className="block text-center text-caramel hover:underline">
              Ver no site ↗
            </Link>
          )}
        </Card>
      </aside>

      <MediaPickerDialog
        open={picker !== null}
        multiple={picker === "gallery"}
        media={media}
        onClose={() => setPicker(null)}
        onConfirm={(items) => {
          if (picker === "cover" && items[0]) {
            setCover(mediaSourceOf(items[0]));
            if (!coverAlt && items[0].alt) setCoverAlt(items[0].alt);
          }
          if (picker === "gallery") {
            setGallery((current) => [
              ...current,
              ...items.map((item) => ({ src: mediaSourceOf(item), alt: item.alt ?? "", caption: "" })),
            ]);
          }
        }}
      />
    </Form>
  );
}
