import { Outlet, useLocation, useRouteLoaderData } from "react-router";
import { DemoBanner, WhatsAppFloat } from "../components/shared/Blocks.jsx";
import { SiteFooter } from "../components/shared/SiteFooter.jsx";
import { SiteHeader } from "../components/shared/SiteHeader.jsx";
import { DEFAULT_SITE_SETTINGS } from "../features/settings/settings.defaults.js";

export default function PublicLayout() {
  const root = useRouteLoaderData("root");
  const settings = root?.settings ?? DEFAULT_SITE_SETTINGS;
  const { pathname } = useLocation();
  const onBriefing = pathname.startsWith("/briefing");

  return (
    <>
      {root?.env?.DEMO_MODE && <DemoBanner />}
      <SiteHeader studioName={settings.studio_name} />
      <main id="conteudo" className="flex-1 focus:outline-none" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter settings={settings} />
      {/* No briefing o botão flutuante cobriria os botões de navegação do formulário no celular. */}
      {!onBriefing && <WhatsAppFloat whatsapp={settings.contact_whatsapp} />}
    </>
  );
}
