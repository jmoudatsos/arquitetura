import { CircleCheck, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Layout.jsx";
import { getRoom } from "../briefing.options.js";
import { buildWhatsAppUrl } from "../lead.format.js";

export function protocolOf(leadId) {
  return leadId ? String(leadId).replace(/-/g, "").slice(0, 8).toUpperCase() : null;
}

export function BriefingSuccess({ name, rooms, leadId, studioWhatsapp, demo, onRestart }) {
  const headingRef = useRef(null);
  const firstName = String(name ?? "").trim().split(/\s+/)[0];
  const protocol = protocolOf(leadId);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const message = [
    `Olá! Acabei de enviar meu briefing pelo site${protocol ? ` (protocolo #${protocol})` : ""}.`,
    name ? `Nome: ${name}.` : null,
    rooms.length ? `Ambientes: ${rooms.map((id) => getRoom(id)?.shortTitle ?? id).join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="mx-auto max-w-2xl animate-rise-in p-8 text-center sm:p-14">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-walnut/50 bg-walnut/10 text-caramel">
        <CircleCheck className="size-8" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="eyebrow text-caramel">Recebemos seu briefing</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-[2.25rem] leading-tight text-bone outline-none sm:text-[2.75rem]">
        Obrigado{firstName ? `, ${firstName}` : ""}!
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-[1.125rem] leading-relaxed text-mute">
        Nossa equipe já recebeu o mapeamento dos seus ambientes ({rooms.length} {rooms.length === 1 ? "cômodo" : "cômodos"}).
        Vamos compatibilizar as ideias com as melhores soluções de ergonomia e marcenaria.
      </p>
      {protocol && (
        <p className="mt-5 text-[1rem] text-faint">
          Protocolo <span className="tabular font-semibold text-bone">#{protocol}</span>
        </p>
      )}

      <ol className="mx-auto mt-8 max-w-md space-y-3 rounded-sm border border-line bg-ink p-5 text-left text-[1.0625rem]">
        <li className="eyebrow mb-1 list-none text-faint">Próximos passos</li>
        <li className="flex gap-3 text-mute">
          <span className="tabular text-caramel">01</span> Análise técnica da planta e compatibilização dos eletros.
        </li>
        <li className="flex gap-3 text-mute">
          <span className="tabular text-caramel">02</span> Conversa de alinhamento pelo WhatsApp em até 1 dia útil.
        </li>
        <li className="flex gap-3 text-mute">
          <span className="tabular text-caramel">03</span> Apresentação do cronograma e da proposta de projeto.
        </li>
      </ol>

      {demo && (
        <p className="mx-auto mt-6 max-w-md rounded-sm border border-walnut/30 bg-walnut/8 px-4 py-3 text-[0.9375rem] text-mute">
          Modo demonstração: o briefing foi salvo em memória e pode ser visto em{" "}
          <a href="/admin/leads" className="text-caramel underline underline-offset-4">
            /admin/leads
          </a>
          . Nenhum e-mail ou WhatsApp foi disparado.
        </p>
      )}

      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        {studioWhatsapp && (
          <ButtonLink href={buildWhatsAppUrl(studioWhatsapp, message)}>
            <MessageCircle className="size-4" aria-hidden="true" /> Avisar pelo WhatsApp
          </ButtonLink>
        )}
        <ButtonLink to="/" variant="secondary">
          Voltar ao início
        </ButtonLink>
      </div>
      <Button variant="link" size="sm" className="mt-6" onClick={onRestart}>
        Enviar outro briefing
      </Button>
    </Card>
  );
}
