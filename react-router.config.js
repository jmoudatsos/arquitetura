/** @type {import("@react-router/dev/config").Config} */
export default {
  appDirectory: "app",
  buildDirectory: "build",
  // SSR ligado: páginas públicas chegam prontas para SEO e o painel admin
  // valida a sessão no servidor antes de renderizar qualquer dado.
  basename: "/arquitetura/",
  ssr: false,
};
