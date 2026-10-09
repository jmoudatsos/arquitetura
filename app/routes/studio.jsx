import { Compass, Hammer, Ruler } from "lucide-react";
import { useRouteLoaderData } from "react-router";
import { CtaBand, Figure, PageHero } from "../components/shared/Blocks.jsx";
import { Container, Eyebrow, SectionHeading } from "../components/ui/Layout.jsx";
import { buildMeta } from "../utils/seo.js";

export const meta = ({ matches }) =>
  buildMeta(matches, {
    title: "Estúdio",
    description: "Arquitetura de interiores com marcenaria própria: do briefing ao projeto 3D, da produção à montagem.",
    path: "/estudio",
  });

const PILLARS = [
  {
    icon: Compass,
    title: "Desenho autoral",
    text: "Cada móvel é desenhado para o ambiente e para a rotina de quem vai usá-lo — nada sai de catálogo.",
  },
  {
    icon: Ruler,
    title: "Engenharia de marcenaria",
    text: "Detalhamento executivo módulo a módulo: ferragens, cargas, ventilação de eletros e passagem de cabos.",
  },
  {
    icon: Hammer,
    title: "Montagem limpa",
    text: "Equipe própria, ambiente protegido durante a obra e vistoria final antes da entrega.",
  },
];

const STEPS = [
  ["Briefing online", "Você responde ao briefing interativo e envia planta e referências. Respondemos pelo WhatsApp para alinhar os próximos passos."],
  ["Visita & medição", "Conferimos medidas, prumos, pontos elétricos e hidráulicos — e conversamos sobre o que não cabe num formulário."],
  ["Estudo & 3D", "Apresentamos o layout, as imagens 3D com os acabamentos reais e o orçamento detalhado por ambiente."],
  ["Detalhamento executivo", "Com o projeto aprovado, cada peça é detalhada para produção com tolerâncias de marcenaria fina."],
  ["Produção", "Corte, usinagem, montagem de caixas e acabamento em ambiente controlado, com conferência de qualidade."],
  ["Instalação & entrega", "Montagem no local, regulagem de portas e gavetas, limpeza e entrega com orientações de uso e manutenção."],
];

export default function Studio() {
  const { settings } = useRouteLoaderData("root");
  const paragraphs = String(settings.about_body ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <PageHero eyebrow="Estúdio" title={settings.about_title} />

      <Container className="grid gap-14 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div className="prose-studio max-w-2xl">
          {paragraphs.length ? (
            paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)
          ) : (
            <p>Escreva aqui a história do estúdio em Admin › Configurações.</p>
          )}
          {settings.service_area && <p className="text-bone">{settings.service_area}</p>}
        </div>
        <Figure
          src="/images/studio/workshop-tools.webp"
          alt="Ferramentas de marcenaria sobre bancada de madeira"
          ratio="aspect-[4/3]"
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="rounded-xs"
        />
      </Container>

      <section className="border-t border-line bg-ink-soft">
        <Container className="py-20 lg:py-28">
          <SectionHeading eyebrow="O que nos guia" title="Três compromissos em cada projeto" />
          <ul className="mt-14 grid gap-10 md:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="border-t border-line pt-6">
                <Icon className="size-7 text-caramel" strokeWidth={1.3} aria-hidden="true" />
                <h3 className="mt-5 text-[1.625rem] text-bone">{title}</h3>
                <p className="mt-2 text-[1.0625rem] text-mute">{text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-t border-line">
        <Container className="grid gap-14 py-20 lg:grid-cols-[1fr_1.6fr] lg:py-28">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow="Processo"
              title="Do briefing à entrega"
              lead="Transparência em cada etapa: você sabe o que está acontecendo e o que vem a seguir."
            />
            <Figure
              src="/images/studio/wood-texture.webp"
              alt=""
              ratio="aspect-[4/5]"
              sizes="(min-width: 1024px) 35vw, 100vw"
              className="mt-10 hidden rounded-xs lg:block"
            />
          </div>
          <ol className="relative border-l border-line pl-8 sm:pl-12">
            {STEPS.map(([title, text], index) => (
              <li key={title} className="relative pb-12 last:pb-0">
                <span
                  className="absolute top-1 -left-[2.55rem] flex size-5 items-center justify-center rounded-full border border-walnut bg-ink sm:-left-[3.55rem]"
                  aria-hidden="true"
                >
                  <span className="size-1.5 rounded-full bg-walnut" />
                </span>
                <Eyebrow className="text-faint">Etapa {String(index + 1).padStart(2, "0")}</Eyebrow>
                <h3 className="mt-2 text-[1.75rem] text-bone">{title}</h3>
                <p className="mt-2 max-w-xl text-[1.0625rem] text-mute">{text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <CtaBand whatsapp={settings.contact_whatsapp} />
    </>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "../components/shared/RouteError.jsx";
