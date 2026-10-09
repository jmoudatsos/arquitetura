import { expect, test } from "@playwright/test";
import { loginAsAdmin, SAMPLE_PDF, trackErrors } from "./helpers.js";

test("briefing completo → sucesso → lead aparece no painel com todos os detalhes", async ({ page }) => {
  const errors = trackErrors(page);
  const name = `Cliente E2E ${Date.now()}`;

  await page.goto("/briefing");
  await expect(page.getByRole("progressbar", { name: "Progresso do briefing" })).toHaveAttribute("aria-valuenow", "20");

  // Etapa 1 — validação e preenchimento
  await page.getByRole("button", { name: /Avançar para ambientes/ }).click();
  await expect(page.getByText("Informe seu nome completo")).toBeVisible();
  await expect(page.getByLabel(/Nome completo/)).toBeFocused();

  await page.getByLabel(/Nome completo/).fill(name);
  await page.getByLabel(/WhatsApp \/ telefone/).pressSequentially("48977776666");
  await page.getByLabel(/E-mail/).fill("cliente.e2e@exemplo.com");
  await page.getByLabel(/Cidade & bairro/).fill("Urubici / Centro");
  await page.getByRole("radio", { name: "Casa" }).click();
  await page.getByRole("radio", { name: "Em construção" }).click();
  await page.getByLabel(/Previsão para início/).selectOption("Imediatamente");
  await page.getByLabel(/Investimento em marcenaria/).selectOption("Acima de R$ 80.000");
  await page.getByRole("button", { name: /Avançar para ambientes/ }).click();

  // Etapa 2
  await page.getByRole("checkbox", { name: /Cozinha Planejada/ }).click();
  await page.getByRole("checkbox", { name: /Espaço Gourmet/ }).click();
  await page.getByRole("button", { name: /Detalhar 2 ambientes/ }).click();

  // Etapa 3 — abas, matriz e texto
  await expect(page.getByRole("tab", { name: /Cozinha/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("radio", { name: "Em formato L" }).click();
  await page
    .getByRole("group", { name: "Máquina lava-louças" })
    .or(page.getByRole("radiogroup", { name: "Máquina lava-louças" }))
    .getByRole("radio", { name: "Vou comprar" })
    .click();
  await page.getByRole("checkbox", { name: "Lixeira dupla embutida (reciclável + orgânico)" }).click();
  await page.getByLabel(/Observações sobre a cozinha/).fill("Cozinhamos muito aos fins de semana.");
  await page.getByRole("button", { name: /Próximo: Gourmet/ }).click();
  await expect(page.getByRole("tab", { name: /Gourmet/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("checkbox", { name: "Churrasqueira" }).click();
  await page.getByRole("button", { name: /Avançar para estilo/ }).click();

  // Etapa 4 — estilo, material, link e anexo
  await page.getByRole("radio", { name: /Contemporâneo & Sofisticado/ }).click();
  await page.getByRole("checkbox", { name: /MDF amadeirado escuro/ }).click();
  const linkInput = page.getByRole("textbox", { name: /Links de referência/ });
  await linkInput.fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Cole um link completo, começando com https://")).toBeVisible();
  await linkInput.fill("https://br.pinterest.com/pin/123456/");
  await linkInput.press("Enter");
  await expect(page.getByRole("link", { name: "https://br.pinterest.com/pin/123456/" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
  await expect(page.getByText(SAMPLE_PDF.name)).toBeVisible();
  await page.getByRole("button", { name: /Revisar & finalizar/ }).click();

  // Etapa 5 — revisão, edição e envio
  await expect(page.getByRole("heading", { name: "Resumo do seu briefing" })).toBeVisible();
  await expect(page.getByText("Em formato L")).toBeVisible();
  await expect(page.getByText("Máquina lava-louças: Vou comprar")).toBeVisible();
  await page.getByLabel(/prioridade especial/).fill("Portas com amortecimento, por favor.");
  await page.getByRole("button", { name: /Enviar briefing completo/ }).click();
  await expect(page.getByText(/Precisamos da sua autorização/)).toBeVisible();
  await page.getByLabel(/Autorizo o uso destes dados/).check();
  await page.getByRole("button", { name: /Enviar briefing completo/ }).click();

  await expect(page.getByRole("heading", { name: `Obrigado, Cliente!` })).toBeVisible();
  const whatsapp = page.getByRole("link", { name: /Avisar pelo WhatsApp/ });
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/5548999999999\?text=/);
  expect(decodeURIComponent(await whatsapp.getAttribute("href"))).toContain(name);

  // Rascunho limpo: recarregar volta ao início vazio
  await page.goto("/briefing");
  await expect(page.getByLabel(/Nome completo/)).toHaveValue("");

  // Painel
  await loginAsAdmin(page, "/admin/leads");
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await expect(row.getByRole("combobox")).toHaveValue("novo");
  await row.getByRole("link", { name }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name })).toBeVisible();
  // (exact: o mesmo texto também aparece na prévia da mensagem, recolhida)
  await expect(dialog.getByText("cliente.e2e@exemplo.com", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Urubici / Centro", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Churrasqueira", { exact: true })).toBeVisible();
  await expect(dialog.getByText(new RegExp(`^${SAMPLE_PDF.name.replace(/[.]/g, "\\.")} \\(`))).toBeVisible();
  await expect(dialog.getByText("Portas com amortecimento, por favor.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5548977776666/);

  // Status e anotações
  await dialog.getByRole("combobox", { name: new RegExp(`Status de ${name}`) }).selectOption("em_contato");
  await dialog.getByLabel("Anotações internas").fill("Visita marcada para terça.");
  await dialog.getByRole("button", { name: "Salvar anotações" }).click();
  await expect(dialog.getByText("Anotações salvas.")).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: new RegExp(name) }).getByRole("combobox")).toHaveValue("em_contato");

  expect(errors).toEqual([]);
});
