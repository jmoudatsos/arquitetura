import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations, trackErrors } from "./helpers.js";

test.describe("site público", () => {
  test("home: hero do mockup, card de início e navegação", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Marcenaria sob medida & arquitetura de interiores/i);
    await expect(page.getByRole("heading", { name: "Iniciar seu projeto" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link")).toHaveText([
      "Projetos",
      "Serviços",
      "Estúdio",
      "Briefing",
    ]);
    // Fonte da marca carregada
    const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(fontFamily).toContain("Cormorant Garamond");
    // Paleta: fundo grafite carvão
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(22, 22, 22)");
    expect(errors).toEqual([]);
  });

  test("card da home leva ao briefing com nome, WhatsApp e ambientes preenchidos (sem dados pessoais na URL)", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("form", { has: page.getByRole("heading", { name: "Iniciar seu projeto" }) });
    await card.getByRole("checkbox", { name: "Cozinha" }).click();
    await card.getByRole("checkbox", { name: "Living" }).click();
    await card.getByLabel("Seu nome").fill("Helena Prado");
    await card.getByLabel("WhatsApp").fill("49988887777");
    await expect(card.getByLabel("WhatsApp")).toHaveValue("(49) 98888-7777");
    await card.getByRole("button", { name: /Continuar briefing/ }).click();

    await expect(page).toHaveURL(/\/briefing$/);
    await expect(page.getByLabel(/Nome completo/)).toHaveValue("Helena Prado");
    await expect(page.getByLabel(/WhatsApp \/ telefone/)).toHaveValue("(49) 98888-7777");
    await expect(page.getByText("Trouxemos o que você já informou")).toBeVisible();
  });

  test("projetos: filtro por categoria e página de detalhe", async ({ page }) => {
    await page.goto("/projetos");
    // ≥ 7: outros testes (admin) podem ter criado projetos no mesmo servidor demo.
    expect(await page.getByRole("article").count()).toBeGreaterThanOrEqual(7);
    await page.getByRole("link", { name: /^Cozinhas/ }).click();
    await expect(page).toHaveURL(/categoria=cozinha/);
    await expect(page.getByRole("article")).toHaveCount(2);

    await page.getByRole("link", { name: /Cozinha Japandi/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Cozinha Japandi/i);
    await expect(page.getByText("Lâmina de freijó claro")).toBeVisible();
    const cta = page.getByRole("link", { name: "Quero um projeto assim" });
    await expect(cta).toHaveAttribute("href", "/briefing?ambientes=cozinha&estilo=minimalista");
    await cta.click();
    await page.getByLabel(/Nome completo/).waitFor();
    await expect(page.getByRole("heading", { name: /Sobre você/ })).toBeVisible();
  });

  test("serviços e FAQ", async ({ page }) => {
    await page.goto("/servicos");
    await expect(page.getByRole("heading", { level: 2, name: "Marcenaria sob medida" })).toBeVisible();
    const question = page.getByText("Preciso ter a planta do imóvel para começar?");
    await question.click();
    await expect(page.getByText(/A planta ajuda a adiantar o estudo/)).toBeVisible();
  });

  test("404 dentro do layout do site", async ({ page }) => {
    const response = await page.goto("/projetos/nao-existe");
    expect(response.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  });

  test("cabeçalhos de segurança e robots", async ({ page, request }) => {
    const response = await page.goto("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /admin");
  });

  for (const path of ["/", "/projetos", "/projetos/living-painel-ripado", "/servicos", "/estudio", "/briefing", "/privacidade"]) {
    test(`acessibilidade (axe, WCAG AA): ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousA11yViolations(page);
    });
  }
});
