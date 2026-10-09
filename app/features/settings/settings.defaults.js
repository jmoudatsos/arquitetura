/**
 * Valores usados quando um campo de `site_settings` está vazio
 * (ex.: antes de rodar o seed). Edite os valores reais pelo painel.
 */
export const DEFAULT_SITE_SETTINGS = {
  studio_name: "W Studio",
  tagline: "Marcenaria sob medida & arquitetura de interiores",
  hero_title: "Marcenaria sob medida & arquitetura de interiores",
  hero_subtitle: "Na região serrana",
  hero_image: "/images/projects/cozinha-nogueira-cover.webp",
  hero_image_alt: "Cozinha planejada em madeira escura",
  about_title: "Desenhamos móveis que organizam a rotina e duram décadas",
  about_body: "",
  contact_email: "",
  contact_whatsapp: "",
  contact_phone: "",
  address: "",
  city: "",
  service_area: "",
  opening_hours: "",
  instagram_url: "",
  seo_title: "",
  seo_description: "",
};

export const SITE_SETTINGS_FIELDS = Object.keys(DEFAULT_SITE_SETTINGS);

export const DEFAULT_NOTIFICATION_SETTINGS = {
  email_enabled: true,
  email_recipients: [],
  whatsapp_enabled: true,
  whatsapp_recipient: "",
};
