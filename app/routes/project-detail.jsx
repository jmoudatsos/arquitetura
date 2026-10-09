import { ArrowLeft, ArrowRight } from "lucide-react";
import { data, Link, useLoaderData, useRouteLoaderData } from "react-router";
import { CtaBand, Figure } from "../components/shared/Blocks.jsx";
import { ButtonLink } from "../components/ui/Button.jsx";
import { Container, Eyebrow } from "../components/ui/Layout.jsx";
import { ProjectFacts, ProjectGallery } from "../features/projects/project.components.jsx";
import { getCategory } from "../features/projects/project.schema.js";
import { getPublishedProjectBySlug } from "../features/projects/project.service.js";
import { getDb } from "../lib/supabase.server.js";
import { buildMeta } from "../utils/seo.js";

export const meta = ({ matches, data: loaderData }) => {
  const project = loaderData?.project;
  if (!project) return buildMeta(matches, { title: "Projeto não encontrado", noindex: true });
  return buildMeta(matches, {
    title: project.seo_title || project.title,
    description: project.seo_description || project.summary,
    image: project.cover_url,
    path: `/projetos/${project.slug}`,
    type: "article",
  });
};

export async function loader({ request, params }) {
  const { db, headers } = getDb(request);
  const result = await getPublishedProjectBySlug(db, params.slug);
  if (!result) throw data(null, { status: 404, statusText: "Projeto não encontrado" });
  return data(result, { headers });
}

export default function ProjectDetail() {
  const { project, previous, next } = useLoaderData();
  const { settings } = useRouteLoaderData("root");
  const paragraphs = String(project.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const room = getCategory(project.category)?.room;
  const briefingLink = `/briefing?${new URLSearchParams({
    ...(room ? { ambientes: room } : {}),
    ...(project.style ? { estilo: project.style } : {}),
  })}`;

  return (
    <article>
      <Container className="pt-10 sm:pt-14">
        <Link to="/projetos" className="inline-flex items-center gap-2 text-[1rem] text-mute hover:text-caramel">
          <ArrowLeft className="size-4" aria-hidden="true" /> Todos os projetos
        </Link>
        <header className="mt-8 max-w-4xl">
          <Eyebrow>{[getCategory(project.category)?.label, project.location].filter(Boolean).join(" · ")}</Eyebrow>
          <h1 className="display-caps mt-4 animate-rise-in text-[2.75rem] text-bone sm:text-[3.75rem] lg:text-[4.5rem]">
            {project.title}
          </h1>
          {project.summary && <p className="mt-6 max-w-2xl text-[1.25rem] leading-relaxed text-mute">{project.summary}</p>}
        </header>
      </Container>

      <Container className="mt-12">
        <Figure
          src={project.cover_url}
          alt={project.cover_alt || project.title}
          ratio="aspect-[16/10] lg:aspect-[21/10]"
          priority
          sizes="(min-width: 1280px) 1200px, 100vw"
          className="animate-fade-in rounded-xs"
        />
      </Container>

      <Container className="grid gap-14 py-16 lg:grid-cols-[18rem_1fr] lg:gap-20 lg:py-24">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ProjectFacts project={project} />
          {project.materials?.length > 0 && (
            <div className="mt-8 border-t border-line pt-3">
              <p className="eyebrow text-faint">Materiais</p>
              <ul className="mt-3 space-y-1.5">
                {project.materials.map((material) => (
                  <li key={material} className="text-[1.0625rem] text-bone">
                    {material}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ButtonLink to={briefingLink} className="mt-10 w-full">
            Quero um projeto assim
          </ButtonLink>
        </aside>

        <div className="min-w-0">
          {paragraphs.length > 0 && (
            <div className="prose-studio max-w-2xl">
              {paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          )}
          {project.gallery?.length > 0 && (
            <div className="mt-14">
              <ProjectGallery items={project.gallery} title={project.title} />
            </div>
          )}
        </div>
      </Container>

      {(previous || next) && (
        <nav aria-label="Outros projetos" className="border-t border-line">
          <Container className="grid gap-6 py-10 sm:grid-cols-2">
            {previous ? (
              <Link to={`/projetos/${previous.slug}`} className="group">
                <span className="eyebrow text-faint">Anterior</span>
                <span className="mt-2 flex items-center gap-2 text-[1.5rem] text-bone group-hover:text-caramel">
                  <ArrowLeft className="size-5" aria-hidden="true" /> {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/projetos/${next.slug}`} className="group sm:text-right">
                <span className="eyebrow text-faint">Próximo</span>
                <span className="mt-2 flex items-center gap-2 text-[1.5rem] text-bone group-hover:text-caramel sm:justify-end">
                  {next.title} <ArrowRight className="size-5" aria-hidden="true" />
                </span>
              </Link>
            )}
          </Container>
        </nav>
      )}

      <CtaBand whatsapp={settings.contact_whatsapp} title="Quer um projeto assim?" />
    </article>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "../components/shared/RouteError.jsx";
