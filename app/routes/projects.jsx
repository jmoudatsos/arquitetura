import { FolderOpen } from "lucide-react";
import { data, useLoaderData, useRouteLoaderData } from "react-router";
import { CtaBand, PageHero } from "../components/shared/Blocks.jsx";
import { ButtonLink } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { Container } from "../components/ui/Layout.jsx";
import { CategoryFilter, ProjectCard } from "../features/projects/project.components.jsx";
import { getCategory, PROJECT_CATEGORIES } from "../features/projects/project.schema.js";
import { listPublishedProjects } from "../features/projects/project.service.js";
import { getDb } from "../lib/supabase.server.js";
import { buildMeta } from "../utils/seo.js";

export const meta = ({ matches, data: loaderData }) =>
  buildMeta(matches, {
    title: loaderData?.activeCategory ? `Projetos · ${getCategory(loaderData.activeCategory)?.label}` : "Projetos",
    description: "Cozinhas, closets, livings, banheiros e home offices com marcenaria sob medida.",
    path: loaderData?.activeCategory ? `/projetos?categoria=${loaderData.activeCategory}` : "/projetos",
  });

export async function loader({ request }) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("categoria");
  const activeCategory = PROJECT_CATEGORIES.some((c) => c.id === requested) ? requested : null;

  const { db, headers } = getDb(request);
  const all = await listPublishedProjects(db);

  const categories = PROJECT_CATEGORIES.map((category) => ({
    ...category,
    count: all.filter((project) => project.category === category.id).length,
  })).filter((category) => category.count > 0);

  const projects = activeCategory ? all.filter((project) => project.category === activeCategory) : all;
  return data({ projects, categories, activeCategory, total: all.length }, { headers });
}

export default function Projects() {
  const { projects, categories, activeCategory, total } = useLoaderData();
  const { settings } = useRouteLoaderData("root");

  return (
    <>
      <PageHero
        eyebrow="Portfólio"
        title="Projetos"
        lead="Uma seleção de ambientes desenhados e produzidos pelo estúdio — cada um a partir de um briefing como o seu."
      >
        {categories.length > 1 && (
          <div className="mt-10">
            <CategoryFilter categories={categories} active={activeCategory} />
          </div>
        )}
      </PageHero>

      <Container className="py-16 lg:py-24">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={total === 0 ? "Novos projetos em breve" : "Nenhum projeto nesta categoria ainda"}
            action={
              total > 0 ? (
                <ButtonLink to="/projetos" variant="secondary">
                  Ver todos
                </ButtonLink>
              ) : null
            }
          >
            Enquanto isso, conte sobre o seu espaço no briefing.
          </EmptyState>
        ) : (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} priority={index < 3} headingLevel="h2" />
            ))}
          </div>
        )}
      </Container>

      <CtaBand whatsapp={settings.contact_whatsapp} title="Quer um projeto assim?" />
    </>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "../components/shared/RouteError.jsx";
