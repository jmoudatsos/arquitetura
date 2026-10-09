import { defineConfig, devices } from "@playwright/test";

/**
 * Testes ponta a ponta contra o BUILD DE PRODUÇÃO em modo demonstração
 * (sem Supabase). Primeira vez: `npx playwright install chromium`.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // o banco demo vive na memória do servidor: testes em série
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: "npm run build && npx react-router-serve ./build/server/index.js",
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      HOST: "127.0.0.1",
      NODE_ENV: "production",
      FORCE_DEMO_MODE: "1",
      SESSION_SECRET: "segredo-e2e",
      DEMO_ADMIN_EMAIL: "admin@demo.local",
      DEMO_ADMIN_PASSWORD: "senha-e2e",
      SITE_URL: `http://127.0.0.1:${PORT}`,
    },
  },
});
