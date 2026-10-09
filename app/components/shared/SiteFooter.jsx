import { Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router";
import { buildWhatsAppUrl } from "../../features/leads/lead.format.js";
import { formatPhoneDisplay } from "../../features/leads/lead.mapper.js";
import { currentYear } from "../../utils/format-date.js";
import { Container } from "../ui/Layout.jsx";
import { Logo } from "./Logo.jsx";
import { PUBLIC_NAV } from "./SiteHeader.jsx";

export function SiteFooter({ settings }) {
  const whatsapp = settings.contact_whatsapp;
  return (
    <footer className="mt-auto border-t border-line bg-ink-soft">
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo name={settings.studio_name} />
          {settings.tagline && <p className="mt-6 max-w-sm text-[1.0625rem] leading-relaxed text-mute">{settings.tagline}</p>}
          {settings.service_area && <p className="mt-3 max-w-sm text-[1rem] leading-relaxed text-faint">{settings.service_area}</p>}
        </div>

        <nav aria-label="Rodapé" className="md:col-span-3">
          <p className="eyebrow mb-5 text-faint">Navegação</p>
          <ul className="space-y-3">
            <li>
              <Link to="/" className="text-bone transition-colors hover:text-caramel">
                Início
              </Link>
            </li>
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-bone transition-colors hover:text-caramel">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-4">
          <p className="eyebrow mb-5 text-faint">Contato</p>
          <ul className="space-y-4 text-[1.0625rem]">
            {whatsapp && (
              <li>
                <a
                  href={buildWhatsAppUrl(whatsapp, "Olá! Vim pelo site e gostaria de conversar sobre um projeto.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 text-bone hover:text-caramel"
                >
                  <MessageCircle className="size-[1.125rem] text-caramel" aria-hidden="true" />
                  <span className="tabular">{formatPhoneDisplay(whatsapp)}</span>
                </a>
              </li>
            )}
            {settings.contact_email && (
              <li>
                <a href={`mailto:${settings.contact_email}`} className="inline-flex items-center gap-3 text-bone hover:text-caramel">
                  <Mail className="size-[1.125rem] text-caramel" aria-hidden="true" />
                  {settings.contact_email}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex items-start gap-3 text-mute">
                <MapPin className="mt-1 size-[1.125rem] shrink-0 text-caramel" aria-hidden="true" />
                <span>
                  {settings.address}
                  {settings.opening_hours && <span className="mt-1 block text-faint">{settings.opening_hours}</span>}
                </span>
              </li>
            )}
            {settings.instagram_url && (
              <li>
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-bone hover:text-caramel"
                >
                  <Instagram className="size-[1.125rem] text-caramel" aria-hidden="true" />
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col gap-3 py-6 text-[0.9375rem] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear()} {settings.studio_name}. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <Link to="/privacidade" className="hover:text-bone">
              Privacidade
            </Link>
            <Link to="/admin" className="hover:text-bone" rel="nofollow">
              Área restrita
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
