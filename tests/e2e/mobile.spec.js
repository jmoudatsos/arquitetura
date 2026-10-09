import { expect, test } from "@playwright/test";

const PAGES = ["/", "/projetos", "/projetos/cozinha-nogueira-e-pedra", "/servicos", "/estudio", "/briefing", "/privacidade", "/admin/login"];

test.describe("largura de 360 px (sem zoom automático do navegador móvel)", () => {
  // Em emulação "isMobile" o Chrome amplia a viewport para caber o conteúdo e
  // esconderia o estouro; aqui a viewport é fixa.
  test.use({ viewport: { width: 360, height: 780 }, isMobile: false, hasTouch: false });

  for (const path of PAGES) {
    test(`sem rolagem horizontal: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const culprits = [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().right > width + 1)
          .filter((el) => !el.closest(".sr-only, [aria-hidden='true']"))
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
        return { extra: document.documentElement.scrollWidth - width, culprits };
      });
      expect(overflow.extra, overflow.culprits.join(" | ")).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("celular", () => {
  test("menu móvel abre, navega e fecha", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Principal (celular)" })).toBeHidden();
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const nav = page.getByRole("navigation", { name: "Principal (celular)" });
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Serviços" }).click();
    await expect(page).toHaveURL(/\/servicos$/);
    await expect(page.getByRole("navigation", { name: "Principal (celular)" })).toBeHidden();
  });

  test("briefing usável no celular (etapa 1 → 2)", async ({ page }) => {
    await page.goto("/briefing");
    await expect(page.getByText(/Etapa 1 de 5/)).toBeVisible();
    await page.getByLabel(/Nome completo/).fill("Pessoa no Celular");
    await page.getByLabel(/WhatsApp \/ telefone/).fill("48911112222");
    await page.getByRole("radio", { name: "Apartamento" }).click();
    await page.getByRole("radio", { name: "Já habitado" }).click();
    await page.getByLabel(/Previsão para início/).selectOption("Nos próximos 6 meses");
    await page.getByLabel(/Investimento em marcenaria/).selectOption("Até R$ 20.000");
    await page.getByRole("button", { name: /Avançar para ambientes/ }).click();
    await expect(page.getByText(/Etapa 2 de 5/)).toBeVisible();
  });
});
