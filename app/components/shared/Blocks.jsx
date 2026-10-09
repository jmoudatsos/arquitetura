import { ArrowRight, MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "../../features/leads/lead.format.js";
import { cn } from "../../utils/cn.js";
import { ButtonLink } from "../ui/Button.jsx";
import { Container, Eyebrow } from "../ui/Layout.jsx";

/** Cabeçalho das páginas internas. */
export function PageHero({ eyebrow, title, lead, children, className }) {
  return (
    <section className={cn("border-b border-line", className)}>
      <Container className="pt-16 pb-12 sm:pt-24 sm:pb-16">
        {eyebrow && <Eyebrow className="mb-5 animate-rise-in">{eyebrow}</Eyebrow>}
        <h1 className="display-caps max-w-4xl animate-rise-in text-[2.75rem] text-bone sm:text-[3.75rem] lg:text-[4.5rem]">
          {title}
        </h1>
        {lead && <p className="mt-6 max-w-2xl animate-rise-in text-[1.25rem] leading-relaxed text-mute">{lead}</p>}
        {children}
      </Container>
    </section>
  );
}

/** Imagem com proporção fixa (evita "pulo" de layout) e tratamento quente. */
export function Figure({ src, alt, ratio = "aspect-[4/3]", className, imgClassName, priority = false, sizes = "100vw", children }) {
  return (
    <div className={cn("relative overflow-hidden bg-panel", ratio, className)}>
      {src && (
        <img
          src={src}
          alt={alt ?? ""}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          sizes={sizes}
          className={cn("img-warm absolute inset-0 size-full object-cover", imgClassName)}
        />
      )}
      {children}
    </div>
  );
}

/** Faixa de chamada para o briefing. */
export function CtaBand({ whatsapp, title = "Tem um espaço em mente?", lead }) {
  return (
    <section className="border-t border-line">
      <Container className="grid items-end gap-10 py-20 md:grid-cols-[1.4fr_1fr] md:py-28">
        <div>
          <Eyebrow className="mb-5">Próximo passo</Eyebrow>
          <h2 className="display-caps text-[2.5rem] text-bone sm:text-[3.25rem]">{title}</h2>
          <p className="mt-5 max-w-xl text-[1.1875rem] leading-relaxed text-mute">
            {lead ??
              "Conte sobre o ambiente, a rotina e o estilo que você imagina. O briefing leva cerca de 3 minutos e já chega organizado para a nossa equipe."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-stretch lg:flex-row lg:justify-end">
          <ButtonLink to="/briefing" size="lg">
            Iniciar briefing <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
          {whatsapp && (
            <ButtonLink
              href={buildWhatsAppUrl(whatsapp, "Olá! Vim pelo site e gostaria de conversar sobre um projeto.")}
              variant="secondary"
              size="lg"
            >
              <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
            </ButtonLink>
          )}
        </div>
      </Container>
    </section>
  );
}

/** Botão flutuante de WhatsApp. */
export function WhatsAppFloat({ whatsapp }) {
  if (!whatsapp) return null;
  return (
    <a
      href={buildWhatsAppUrl(whatsapp, "Olá! Vim pelo site e gostaria de conversar sobre um projeto.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar pelo WhatsApp"
      className="fixed right-5 bottom-5 z-30 flex size-14 items-center justify-center rounded-full border border-walnut/60 bg-ink text-caramel shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-colors hover:bg-walnut hover:text-ink sm:right-8 sm:bottom-8"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </a>
  );
}

/** Aviso de modo demonstração (sem Supabase configurado). */
export function DemoBanner({ admin = false }) {
  return (
    <div className="border-b border-walnut/30 bg-walnut/10 px-4 py-2 text-center text-[0.9375rem] text-mute">
      <span className="font-semibold text-caramel">Modo demonstração</span> · dados de exemplo em memória, nenhuma notificação é
      enviada.{" "}
      {admin ? (
        <span>Configure o Supabase no arquivo .env para persistir.</span>
      ) : (
        <a href="/admin" className="text-bone underline underline-offset-4 hover:text-caramel">
          Abrir painel
        </a>
      )}
    </div>
  );
}
