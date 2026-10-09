import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const isVitest = Boolean(process.env.VITEST);

export default defineConfig({
  base: "/arquitetura/",
  plugins: [
    tailwindcss(),
    // O plugin do React Router não deve rodar dentro do Vitest
    // (ele espera o ciclo de build/dev do framework).
    !isVitest && reactRouter(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },

  // Fora do React Router, o JSX dos testes precisa do runtime automático.
  esbuild: isVitest ? { jsx: "automatic" } : undefined,

  server: {
    port: 5173,
  },

  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    include: [
      "tests/unit/**/*.test.{js,jsx}",
      "tests/integration/**/*.test.{js,jsx}",
    ],
    restoreMocks: true,
    testTimeout: 30_000,
  },
});
