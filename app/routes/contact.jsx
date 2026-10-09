import { Clock, Lock, Mail, MapPin, MessageCircle } from "lucide-react";
import { data, useLoaderData, useLocation, useRouteLoaderData } from "react-router";
import { ButtonLink } from "../components/ui/Button.jsx";
import { Container, Eyebrow } from "../components/ui/Layout.jsx";
import { BriefingWizard } from "../features/leads/briefing/BriefingWizard.jsx";
import { parsePrefill } from "../features/leads/briefing/briefing.state.js";
import { buildWhatsAppUrl } from "../features/leads/lead.format.js";
import { formatPhoneDisplay } from "../features/leads/lead.mapper.js";
import { briefingSchema, issuesToFieldErrors } from "../features/leads/lead.schema.js";
import { submitBriefing } from "../features/leads/lead.service.js";
import { getDb } from "../lib/supabase.server.js";
import { buildMeta } from "../utils/seo.js";

export const meta = ({ matches }) =>
  buildMeta(matches, {
    title: "Briefing interativo",
    description: "Conte sobre o seu espaço em 5 etapas rápidas e receba uma proposta de marcenaria sob medida.",
    path: "/briefing",
  });

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export async function loader({ request }) {
  const url = new URL(request.url);
  const prefill = parsePrefill({ searchParams: url.searchParams });
  const utm = Object.fromEntries(
    UTM_KEYS.map((key) => [key, url.searchParams.get(key)?.slice(0, 120)]).filter(([, value]) => value),
  );
  return { prefill, utm };
}

export async function action({ request }) {
  if (request.method !== "POST") throw data(null, { status: 405 });

  let body;
  try {
    body = await request.json();
  } catch {
    return data({ ok: false, message: "Envio inválido. Recarregue a página e tente novamente." }, { status: 400 });
  }

  // Honeypot preenchido → robô. Respondemos "ok" sem gravar nada.
  if (typeof body?.website === "string" && body.website.trim() !== "") {
    return { ok: true, leadId: null, demo: false };
  }

  const parsed = briefingSchema.safeParse(body);
  if (!parsed.success) {
    return data(
      { ok: false, fieldErrors: issuesToFieldErrors(parsed.error), message: "Revise os campos destacados." },
      { status: 400 },
    );
  }

  const { db, demo } = getDb(request);
  const result = await submitBriefing(parsed.data, { request, db, demo });
  if (!result.ok) {
    return data(
      { ok: false, fieldErrors: result.fieldErrors ?? null, message: result.message },
      { status: result.status ?? 500 },
    );
  }
  return data({ ok: true, leadId: result.leadId, demo: result.demo }, { status: 201 });
}

export default function Contact() {
  const { prefill, utm } = useLoaderData();
  const { settings, env } = useRouteLoaderData("root");
  const location = useLocation();
  // Dados vindos do card da home (estado da navegação, só no navegador).
  const clientPrefill = parsePrefill({ state: location.state });

  return (
    <>
      <section className="border-b border-line">
        <Container className="flex flex-col gap-6 py-12 sm:py-16 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow className="mb-4">Briefing interativo</Eyebrow>
            <h1 className="display-caps text-[2.5rem] text-bone sm:text-[3.5rem]">Iniciar seu projeto</h1>
            <p className="mt-4 max-w-2xl text-[1.1875rem] text-mute">
              Cinco etapas rápidas para entendermos o espaço, a rotina e o estilo. Quanto mais detalhes, mais certeira a proposta.
            </p>
          </div>
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-line px-4 py-2 text-[0.9375rem] text-mute md:self-end">
            <Clock className="size-4 text-caramel" aria-hidden="true" /> Tempo médio: 3 minutos
          </p>
        </Container>
      </section>

      <Container className="grid gap-12 py-12 sm:py-16 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <BriefingWizard
            prefill={prefill}
            clientPrefill={clientPrefill}
            utm={utm}
            origin={clientPrefill.ambientesSelecionados || clientPrefill.nome ? "home" : "briefing"}
            studioWhatsapp={settings.contact_whatsapp}
            demoMode={Boolean(env?.DEMO_MODE)}
          />
        </div>

        <aside className="space-y-8 xl:sticky xl:top-28 xl:self-start" aria-label="Outras formas de contato">
          <div className="rounded-sm border border-line p-6">
            <p className="eyebrow text-caramel">Prefere conversar?</p>
            <p className="mt-3 text-[1.0625rem] text-mute">Fale direto com a equipe — respondemos em horário comercial.</p>
            {settings.contact_whatsapp && (
              <ButtonLink
                href={buildWhatsAppUrl(settings.contact_whatsapp, "Olá! Vim pelo site e gostaria de conversar sobre um projeto.")}
                variant="secondary"
                className="mt-5 w-full"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> {formatPhoneDisplay(settings.contact_whatsapp)}
              </ButtonLink>
            )}
            <ul className="mt-6 space-y-3 text-[1rem] text-mute">
              {settings.contact_email && (
                <li className="flex items-start gap-3">
                  <Mail className="mt-1 size-4 shrink-0 text-caramel" aria-hidden="true" />
                  <a href={`mailto:${settings.contact_email}`} className="break-all hover:text-bone">
                    {settings.contact_email}
                  </a>
                </li>
              )}
              {settings.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 size-4 shrink-0 text-caramel" aria-hidden="true" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings.opening_hours && (
                <li className="flex items-start gap-3">
                  <Clock className="mt-1 size-4 shrink-0 text-caramel" aria-hidden="true" />
                  <span>{settings.opening_hours}</span>
                </li>
              )}
            </ul>
          </div>
          <div className="flex gap-3 px-1 text-[0.9375rem] text-faint">
            <Lock className="mt-0.5 size-4 shrink-0 text-caramel" aria-hidden="true" />
            <p>
              Seus dados são usados apenas para elaborar a proposta, conforme a{" "}
              <a href="/privacidade" className="text-mute underline underline-offset-4 hover:text-bone">
                política de privacidade
              </a>
              .
            </p>
          </div>
        </aside>
      </Container>
    </>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "../components/shared/RouteError.jsx";
