/**
 * Assistente de briefing renderizado de verdade (jsdom + React Router em memória):
 * validação por etapa, navegação, pré-preenchimento e envio para a action.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { BriefingWizard } from "../../app/features/leads/briefing/BriefingWizard.jsx";
import { DRAFT_KEY } from "../../app/features/leads/briefing/briefing.state.js";

function renderWizard({ props = {}, action } = {}) {
  const received = [];
  const Stub = createRoutesStub([
    {
      path: "/briefing",
      Component: () => (
        <QueryClientProvider client={new QueryClient()}>
          <BriefingWizard studioWhatsapp="5548999999999" demoMode {...props} />
        </QueryClientProvider>
      ),
      action:
        action ??
        (async ({ request }) => {
          received.push(await request.json());
          return { ok: true, leadId: "abcdef12-3456-4789-8abc-def012345678", demo: true };
        }),
    },
  ]);
  const user = userEvent.setup();
  render(<Stub initialEntries={["/briefing"]} />);
  return { user, received };
}

async function fillStepOne(user) {
  await user.type(screen.getByLabelText(/Nome completo/), "Mariana Albuquerque");
  await user.type(screen.getByLabelText(/WhatsApp \/ telefone/), "48999990000");
  await user.click(screen.getByRole("radio", { name: "Apartamento" }));
  await user.click(screen.getByRole("radio", { name: "Em reforma" }));
  await user.selectOptions(screen.getByLabelText(/Previsão para início/), "Nos próximos 3 meses");
  await user.selectOptions(screen.getByLabelText(/Investimento em marcenaria/), "R$ 40.000 a 80.000");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("BriefingWizard", () => {
  it("bloqueia a etapa 1 sem os campos obrigatórios e mostra as mensagens", async () => {
    const { user } = renderWizard();
    await user.click(screen.getByRole("button", { name: /Avançar para ambientes/ }));
    expect(await screen.findByText("Informe seu nome completo")).toBeInTheDocument();
    expect(screen.getByText("Informe um WhatsApp válido com DDD")).toBeInTheDocument();
    expect(screen.getByText("Selecione o tipo de imóvel")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Sobre você/ })).toBeInTheDocument();
  });

  it("aplica a máscara de telefone", async () => {
    const { user } = renderWizard();
    const input = screen.getByLabelText(/WhatsApp \/ telefone/);
    await user.type(input, "48999990000");
    expect(input).toHaveValue("(48) 99999-0000");
  });

  it("percorre as 5 etapas e envia o payload validado", async () => {
    const { user, received } = renderWizard();

    await fillStepOne(user);
    await user.click(screen.getByRole("button", { name: /Avançar para ambientes/ }));

    // Etapa 2 — precisa de ao menos um ambiente
    await user.click(await screen.findByRole("button", { name: /Detalhar ambientes/ }));
    expect(await screen.findByText(/Selecione ao menos um ambiente/)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Cozinha Planejada/ }));
    await user.click(screen.getByRole("checkbox", { name: /Quarto \/ Suíte/ }));
    await user.click(screen.getByRole("button", { name: /Detalhar 2 ambientes/ }));

    // Etapa 3 — abas por ambiente
    const tabs = await screen.findAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([expect.stringContaining("Cozinha"), expect.stringContaining("Quarto")]);
    await user.click(screen.getByRole("radio", { name: "Com ilha central" }));
    const fornoRow = screen.getByText("Forno elétrico embutido").parentElement;
    await user.click(within(fornoRow).getByRole("radio", { name: "Vou comprar" }));
    await user.click(screen.getByRole("tab", { name: /Quarto/ }));
    await user.click(screen.getByRole("radio", { name: "Queen size (158 × 198 cm)" }));
    await user.click(screen.getByRole("button", { name: /Avançar para estilo/ }));

    // Etapa 4 — estilo e material
    await user.click(await screen.findByRole("radio", { name: /Natural & Orgânico/ }));
    await user.click(screen.getByRole("checkbox", { name: /Laca fosca acetinada/ }));
    await user.click(screen.getByRole("button", { name: /Revisar & finalizar/ }));

    // Etapa 5 — revisão + consentimento obrigatório
    expect(await screen.findByRole("heading", { name: "Resumo do seu briefing" })).toBeInTheDocument();
    expect(screen.getByText("Mariana Albuquerque")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Enviar briefing completo/ }));
    expect(await screen.findByText(/Precisamos da sua autorização/)).toBeInTheDocument();
    expect(received).toHaveLength(0);

    await user.click(screen.getByRole("checkbox", { name: /Autorizo o uso destes dados/ }));
    await user.click(screen.getByRole("button", { name: /Enviar briefing completo/ }));

    expect(await screen.findByRole("heading", { name: "Obrigado, Mariana!" })).toBeInTheDocument();
    expect(screen.getByText("#ABCDEF12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Avisar pelo WhatsApp/ })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/5548999999999?text="),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      nome: "Mariana Albuquerque",
      whatsapp: "(48) 99999-0000",
      ambientesSelecionados: ["cozinha", "quarto"],
      detalhesAmbientes: {
        cozinha: { layout: "Com ilha central", eletros: { forno: "Vou comprar" } },
        quarto: { tamanhoCama: "Queen size (158 × 198 cm)" },
      },
      estiloPrincipal: "organico",
      materiaisGostados: ["Laca fosca acetinada"],
      consentimento: true,
      origem: "briefing",
      website: "",
    });
    expect(received[0].submissionId).toMatch(/^[0-9a-f-]{36}$/);
    // Rascunho é apagado após o envio.
    await waitFor(() => expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull());
  });

  it("erro de campo vindo do servidor leva de volta à etapa certa", async () => {
    const { user } = renderWizard({
      props: { prefill: { ambientesSelecionados: ["office"] } },
      action: async () => ({ ok: false, fieldErrors: { whatsapp: "Número bloqueado para teste" }, message: "Revise." }),
    });
    await fillStepOne(user);
    await user.click(screen.getByRole("button", { name: /Avançar para ambientes/ }));
    // ambiente veio pré-preenchido pela URL
    expect(await screen.findByRole("checkbox", { name: /Home Office/ })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: /Detalhar 1 ambiente/ }));
    await user.click(await screen.findByRole("button", { name: /Avançar para estilo/ }));
    await user.click(await screen.findByRole("button", { name: /Revisar & finalizar/ }));
    await user.click(await screen.findByRole("checkbox", { name: /Autorizo/ }));
    await user.click(screen.getByRole("button", { name: /Enviar briefing completo/ }));

    expect(await screen.findByText("Número bloqueado para teste")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Sobre você/ })).toBeInTheDocument();
  });

  it("restaura o rascunho salvo neste navegador", async () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        values: { nome: "Rascunho Salvo", whatsapp: "(48) 98888-7777", ambientesSelecionados: ["living"] },
        step: 2,
        maxReached: 2,
        savedAt: Date.now(),
      }),
    );
    const { user } = renderWizard();
    expect(await screen.findByText("Continuamos de onde você parou")).toBeInTheDocument();
    // Volta na etapa em que parou, com as escolhas feitas.
    expect(screen.getByRole("heading", { name: /Quais ambientes/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Sala de Estar/ })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue("Rascunho Salvo");
    expect(screen.queryByText("Continuamos de onde você parou")).toBeNull();
  });
});
