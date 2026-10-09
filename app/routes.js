import { index, layout, prefix, route } from "@react-router/dev/routes";

/**
 * Mapa de rotas (URLs em português).
 *
 *  Público:  /  /projetos  /projetos/:slug  /estudio  /servicos  /briefing  /privacidade
 *  Admin:    /admin/login  /admin  /admin/leads  /admin/projetos  /admin/projetos/novo
 *            /admin/projetos/:id  /admin/midia  /admin/servicos  /admin/configuracoes
 */
export default [
  layout("layouts/PublicLayout.jsx", [
    index("routes/home.jsx"),
    route("projetos", "routes/projects.jsx"),
    route("projetos/:slug", "routes/project-detail.jsx"),
    route("estudio", "routes/studio.jsx"),
    route("servicos", "routes/services.jsx"),
    route("briefing", "routes/contact.jsx"),
    route("privacidade", "routes/privacy.jsx"),
  ]),

  route("admin/login", "routes/admin-login.jsx"),

  ...prefix("admin", [
    layout("layouts/AdminLayout.jsx", [
      index("routes/admin-dashboard.jsx"),
      route("leads", "routes/admin-leads.jsx"),
      route("projetos", "routes/admin-projects.jsx"),
      route("projetos/novo", "routes/admin-project-new.jsx"),
      route("projetos/:id", "routes/admin-project-edit.jsx"),
      route("midia", "routes/admin-media.jsx"),
      route("servicos", "routes/admin-services.jsx"),
      route("configuracoes", "routes/admin-settings.jsx"),
    ]),
  ]),
];
