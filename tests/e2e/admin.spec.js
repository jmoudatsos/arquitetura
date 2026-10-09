import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations, loginAsAdmin, trackErrors } from "./helpers.js";

test.describe("painel admin", () => {
  test("rotas do painel exigem login", async ({ page }) => {
    await page.goto("/admin/projetos");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fprojetos/);
    await page.getByLabel("E-mail").fill("admin@demo.local");
    await page.getByLabel("Senha").fill("errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  });

  test("cria e publica um projeto com capa da biblioteca e ele aparece no site", async ({ page }) => {
    const errors = trackErrors(page);
    const title = `Closet Teste ${Date.now()}`;
    await loginAsAdmin(page, "/admin/projetos");
    await page.getByRole("link", { name: "Novo projeto" }).click();

    await page.getByLabel(/Título/).first().fill(title);
    await expect(page.getByLabel(/Endereço \(slug\)/)).toHaveValue(/^closet-teste-\d+$/);
    await page.getByLabel(/Resumo/).fill("Closet com portas em lâmina natural.");
    await page.getByLabel("Categoria").selectOption("quarto");
    await page.getByLabel("Materiais").fill("Lâmina de nogueira\nLED com sensor");

    await page.getByRole("button", { name: "Escolher capa" }).click();
    const picker = page.getByRole("dialog");
    await picker.getByRole("radio").first().click();
    await picker.getByRole("button", { name: "Usar imagem" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("radio", { name: "Publicado" }).click();
    await page.getByRole("button", { name: "Criar projeto" }).click();
    await expect(page.getByText("Projeto criado.")).toBeVisible();

    await page.goto("/projetos?categoria=quarto");
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("valida o formulário de projeto no servidor", async ({ page }) => {
    await loginAsAdmin(page, "/admin/projetos/novo");
    await page.getByRole("button", { name: "Criar projeto" }).click();
    await expect(page.getByText("Informe o título")).toBeVisible();
  });

  test("configurações: muda o nome do estúdio e o site reflete", async ({ page }) => {
    await loginAsAdmin(page, "/admin/configuracoes");
    const field = page.getByLabel("Nome do estúdio");
    await field.fill("Ateliê Serrano");
    await page.getByRole("button", { name: "Salvar configurações do site" }).click();
    await expect(page.getByText("Configurações do site salvas.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Ateliê Serrano — página inicial/ })).toBeVisible();

    // restaura
    await page.goto("/admin/configuracoes");
    await page.getByLabel("Nome do estúdio").fill("W Studio");
    await page.getByRole("button", { name: "Salvar configurações do site" }).click();
    await expect(page.getByText("Configurações do site salvas.")).toBeVisible();
  });

  test("acessibilidade do painel e do login", async ({ page }) => {
    await page.goto("/admin/login");
    await expectNoSeriousA11yViolations(page);
    await loginAsAdmin(page, "/admin");
    await expectNoSeriousA11yViolations(page);
    await page.goto("/admin/leads");
    await expectNoSeriousA11yViolations(page);
  });
});
