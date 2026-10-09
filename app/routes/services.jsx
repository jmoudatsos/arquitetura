import { Plus } from "lucide-react";
import { data, useLoaderData, useRouteLoaderData } from "react-router";
import { CtaBand, PageHero } from "../components/shared/Blocks.jsx";
import { Container, SectionHeading } from "../components/ui/Layout.jsx";
import { ServiceDetail } from "../features/services/service.components.jsx";
import { listActiveServices } from "../features/services/service.service.js";
import { getDb } from "../lib/supabase.server.js";
import { buildMeta } from "../utils/seo.js";

export const meta = ({ matches }) =>
  buildMeta(matches, {
    title: "Serviços",
    description: "Marcenaria sob medida, arquitetura de interiores, cozinhas planejadas, closets, projeto 3D e montagem.",
    path: "/servicos",
  });

export async function loader({ request }) {
  const { db, headers } = getDb(request);
  return data({ services: await listActiveServices(db) }, { headers });
}

/** Perguntas frequentes sobre o PROCESSO (edite à vontade — não há promessas comerciais aqui). */
const FAQ = [
  [
    "Preciso ter a planta do imóvel para começar?",
    "Não. A planta ajuda a adiantar o estudo, mas fazemos a medição no local antes de qualquer detalhamento. No briefing você pode enviar o que tiver: planta, fotos ou um croqui à mão.",
  ],
  [
    "Vocês fazem só a marcenaria ou o projeto completo?",
    "Os dois. Podemos desenhar apenas os móveis ou integrar a marcenaria ao projeto de interiores completo — layout, iluminação e revestimentos.",
  ],
  [
    "Como é definido o orçamento?",
    "Depois do levantamento técnico apresentamos o projeto com materiais e um orçamento detalhado por ambiente. A faixa de investimento que você indica no briefing nos ajuda a propor as soluções certas.",
  ],
  [
    "Posso comprar os eletrodomésticos depois?",
    "Pode, mas o ideal é definir os modelos antes do detalhamento executivo — torres quentes e nichos de embutir dependem das medidas exatas de cada aparelho.",
  ],
];

export default function Services() {
  const { services } = useLoaderData();
  const { settings } = useRouteLoaderData("root");

  return (
    <>
      <PageHero
        eyebrow="Serviços"
        title="Projeto, marcenaria e montagem"
        lead="Um único estúdio responsável do primeiro croqui à última regulagem de porta."
      />

      <Container className="pb-10">
        {services.map((service, index) => (
          <ServiceDetail key={service.id} service={service} index={index} />
        ))}
      </Container>

      <section className="border-t border-line bg-ink-soft">
        <Container className="grid gap-12 py-20 lg:grid-cols-[1fr_1.6fr] lg:py-28">
          <SectionHeading eyebrow="Dúvidas frequentes" title="Antes de começar" />
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.375rem] text-bone marker:hidden">
                  {question}
                  <Plus className="size-5 shrink-0 text-caramel transition-transform duration-300 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="pb-5 text-[1.0625rem] leading-relaxed text-mute">{answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand whatsapp={settings.contact_whatsapp} />
    </>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "../components/shared/RouteError.jsx";
