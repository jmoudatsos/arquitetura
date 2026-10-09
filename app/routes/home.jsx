import { ArrowRight } from "lucide-react";
import { data, useLoaderData, useRouteLoaderData } from "react-router";
import { CtaBand, Figure } from "../components/shared/Blocks.jsx";
import { ButtonLink } from "../components/ui/Button.jsx";
import { Container, Eyebrow, SectionHeading } from "../components/ui/Layout.jsx";
import { QuickStartCard } from "../features/leads/briefing/QuickStartCard.jsx";
import { ProjectCard } from "../features/projects/project.components.jsx";
import { listFeaturedProjects } from "../features/projects/project.service.js";
import { ServiceIndex } from "../features/services/service.components.jsx";
import { listActiveServices } from "../features/services/service.service.js";
import { getDb } from "../lib/supabase.server.js";
import { imageUrl } from "../utils/image-url.js";
import { buildMeta } from "../utils/seo.js";

export const meta = ({ matches }) => buildMeta(matches, { path: "/" });

export async function loader({ request }) {
  const { db, headers } = getDb(request);
  const [projects, services] = await Promise.all([listFeaturedProjects(db, 4), listActiveServices(db)]);
  return data({ projects, services }, { headers });
}

const PROCESS = [
  ["Briefing", "Você conta sobre o espaço, a rotina e o estilo em poucos minutos — online, no seu tempo."],
  ["Levantamento técnico", "Medição no local, análise da planta e dos pontos elétricos e hidráulicos."],
  ["Projeto & proposta", "Projeto 3D com os materiais escolhidos e um orçamento claro, item a item."],
  ["Produção & montagem", "Marcenaria própria e montagem limpa, com acompanhamento até a entrega."],
];

const MATERIAL_SWATCHES = [
  ["Nogueira", "linear-gradient(115deg,#4a2f20,#6b452f 40%,#5a3a28 60%,#7a5137)"],
  ["Freijó", "linear-gradient(115deg,#9c7650,#b58c62 45%,#a47d57 70%,#c09a70)"],
  ["Carvalho", "linear-gradient(115deg,#b89870,#cdb08a 50%,#bfa07a)"],
  ["Laca grafite", "linear-gradient(135deg,#2a2a2a,#323232)"],
  ["Off-white", "linear-gradient(135deg,#e6e0d5,#efeae1)"],
  ["Pedra natural", "radial-gradient(circle at 30% 30%,#9a948b,#6f6a63 60%,#87817a)"],
];

// Grade editorial dos destaques (colunas de 12): grande/pequeno, pequeno/grande.
const FEATURED_LAYOUT = [
  { span: "md:col-span-7", ratio: "aspect-[4/3]", sizes: "(min-width: 768px) 58vw, 100vw" },
  { span: "md:col-span-5 md:pt-16", ratio: "aspect-[4/5]", sizes: "(min-width: 768px) 42vw, 100vw" },
  { span: "md:col-span-5", ratio: "aspect-[4/5]", sizes: "(min-width: 768px) 42vw, 100vw" },
  { span: "md:col-span-7 md:pt-16", ratio: "aspect-[4/3]", sizes: "(min-width: 768px) 58vw, 100vw" },
];

export default function Home() {
  const { projects, services } = useLoaderData();
  const { settings } = useRouteLoaderData("root");
  const aboutLead = String(settings.about_body ?? "").split(/\n\s*\n/)[0];

  return (
    <>
      {/* ───────────── Hero (mockup) ───────────── */}
      <section className="border-b border-line">
        <Container className="grid grid-cols-1 gap-10 py-8 sm:py-12 lg:grid-cols-[1.3fr_1fr] lg:gap-14 lg:py-16">
          <div className="flex min-w-0 flex-col">
            <Figure
              src={imageUrl(settings.hero_image)}
              alt={settings.hero_image_alt || ""}
              ratio="aspect-[16/11]"
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="animate-fade-in rounded-xs border border-line"
            />
            <h1 className="display-caps mt-8 animate-rise-in text-[2.5rem] text-bone sm:text-[3.25rem] xl:text-[3.875rem]">
              {settings.hero_title}
            </h1>
            {settings.hero_subtitle && <p className="eyebrow mt-4 animate-rise-in text-mute">{settings.hero_subtitle}</p>}
          </div>
          <QuickStartCard className="min-w-0 animate-rise-in self-start lg:sticky lg:top-28" />
        </Container>
      </section>

      {/* ───────────── O estúdio ───────────── */}
      <section>
        <Container className="grid items-center gap-12 py-24 md:grid-cols-[1fr_1.1fr] lg:py-32">
          <Figure
            src="/images/studio/architect-plans.webp"
            alt="Arquiteto desenhando uma planta à mão sobre a mesa de trabalho"
            ratio="aspect-[5/4]"
            sizes="(min-width: 768px) 45vw, 100vw"
            className="rounded-xs"
          />
          <div>
            <SectionHeading eyebrow="O estúdio" title={settings.about_title} lead={aboutLead} />
            <ButtonLink to="/estudio" variant="link" className="mt-8">
              Conheça nosso processo <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* ───────────── Projetos ───────────── */}
      {projects.length > 0 && (
        <section className="border-t border-line">
          <Container className="py-24 lg:py-32">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading eyebrow="Portfólio" title="Projetos selecionados" />
              <ButtonLink to="/projetos" variant="secondary">
                Ver todos os projetos
              </ButtonLink>
            </div>
            <div className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-12">
              {projects.map((project, index) => {
                const layout = FEATURED_LAYOUT[index] ?? FEATURED_LAYOUT[0];
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    ratio={layout.ratio}
                    sizes={layout.sizes}
                    className={layout.span}
                  />
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* ───────────── Serviços ───────────── */}
      {services.length > 0 && (
        <section className="border-t border-line bg-ink-soft">
          <Container className="grid gap-12 py-24 lg:grid-cols-[1fr_1.8fr] lg:py-32">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeading
                eyebrow="Serviços"
                title="Do croqui à última dobradiça"
                lead="Projeto, marcenaria e montagem sob o mesmo teto — um só responsável do começo ao fim."
              />
              <ButtonLink to="/servicos" variant="link" className="mt-8">
                Detalhes dos serviços <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
            <ServiceIndex services={services} />
          </Container>
        </section>
      )}

      {/* ───────────── Processo ───────────── */}
      <section className="border-t border-line">
        <Container className="py-24 lg:py-32">
          <SectionHeading eyebrow="Como trabalhamos" title="Um processo claro, em quatro etapas" />
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {PROCESS.map(([title, text], index) => (
              <li key={title} className="border-t border-line pt-6">
                <span className="tabular text-[2.75rem] leading-none font-light text-walnut">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-[1.5rem] text-bone">{title}</h3>
                <p className="mt-2 text-[1.0625rem] text-mute">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14">
            <ButtonLink to="/briefing" size="lg">
              Começar pelo briefing <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* ───────────── Materiais ───────────── */}
      <section className="border-t border-line bg-ink-soft">
        <Container className="grid items-center gap-10 py-20 lg:grid-cols-[1fr_2fr]">
          <div>
            <Eyebrow className="mb-4">Materiais</Eyebrow>
            <p className="text-[1.75rem] leading-snug text-bone">Lâminas naturais, lacas foscas e pedra — escolhidos junto com você.</p>
          </div>
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {MATERIAL_SWATCHES.map(([name, background]) => (
              <li key={name} className="text-center">
                <span className="block aspect-square rounded-xs border border-line" style={{ background }} aria-hidden="true" />
                <span className="mt-2 block text-[0.9375rem] text-mute">{name}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaBand whatsapp={settings.contact_whatsapp} />
    </>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "../components/shared/RouteError.jsx";
