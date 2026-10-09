import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

export const ADMIN = { email: "admin@demo.local", password: "senha-e2e" };

export async function loginAsAdmin(page, next = "/admin") {
  await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, "\\?")}$`));
}

/** Falha se houver violações sérias/críticas de acessibilidade (inclui contraste). */
export async function expectNoSeriousA11yViolations(page, { exclude = [] } = {}) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  for (const selector of exclude) builder = builder.exclude(selector);
  const { violations } = await builder.analyze();
  const serious = violations
    .filter((violation) => ["serious", "critical"].includes(violation.impact))
    .map((violation) => `${violation.id}: ${violation.help} → ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(serious, serious.join("\n")).toEqual([]);
}

/** Coleta erros de console/página durante o teste. */
export function trackErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** PDF mínimo válido para o upload. */
export const SAMPLE_PDF = {
  name: "planta-apto-302.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
};
