import { describe, expect, it } from "vitest";
import {
  briefingSchema,
  issuesToFieldErrors,
  stepForPath,
  validateStep,
} from "../../app/features/leads/lead.schema.js";
import { maximalBriefing, minimalBriefing, SUBMISSION_ID } from "../fixtures/briefing.js";

function errorsOf(payload) {
  const result = briefingSchema.safeParse(payload);
  return result.success ? {} : issuesToFieldErrors(result.error);
}

describe("briefingSchema", () => {
  it("aceita o briefing mínimo e o máximo", () => {
    expect(briefingSchema.safeParse(minimalBriefing()).success).toBe(true);
    expect(briefingSchema.safeParse(maximalBriefing()).success).toBe(true);
  });

  it("exige nome, WhatsApp, campos do imóvel e consentimento", () => {
    const errors = errorsOf(
      minimalBriefing({ nome: " ", whatsapp: "123", tipoImovel: "", previsaoInicio: "", consentimento: false }),
    );
    expect(errors).toMatchObject({
      nome: expect.any(String),
      whatsapp: "Informe um WhatsApp válido com DDD",
      tipoImovel: "Selecione o tipo de imóvel",
      previsaoInicio: "Selecione a previsão de início",
      consentimento: expect.stringContaining("autorização"),
    });
  });

  it("aceita telefone com DDD em vários formatos e recusa zeros à esquerda que deixariam poucos dígitos", () => {
    for (const whatsapp of ["(48) 99999-0000", "48999990000", "+55 48 99999-0000", "(48) 3333-0000"]) {
      expect(errorsOf(minimalBriefing({ whatsapp })).whatsapp).toBeUndefined();
    }
    expect(errorsOf(minimalBriefing({ whatsapp: "0000000099999" })).whatsapp).toBeDefined();
  });

  it("e-mail é opcional, mas validado quando informado", () => {
    expect(errorsOf(minimalBriefing({ email: "" })).email).toBeUndefined();
    expect(errorsOf(minimalBriefing({ email: "nao-eh-email" })).email).toBe("E-mail inválido");
  });

  it("exige ao menos um ambiente válido e sem repetição", () => {
    expect(errorsOf(minimalBriefing({ ambientesSelecionados: [] })).ambientesSelecionados).toMatch(/ao menos um/);
    expect(errorsOf(minimalBriefing({ ambientesSelecionados: ["garagem"] }))["ambientesSelecionados.0"]).toBe("Ambiente inválido");
    expect(errorsOf(minimalBriefing({ ambientesSelecionados: ["cozinha", "cozinha"] })).ambientesSelecionados).toBe(
      "Ambientes repetidos",
    );
  });

  it("valida respostas dos ambientes contra as opções existentes", () => {
    const errors = errorsOf(
      minimalBriefing({
        detalhesAmbientes: {
          cozinha: { layout: "Em formato Z", eletros: { geladeira: "Talvez" }, campoExtra: "x" },
        },
      }),
    );
    expect(errors["detalhesAmbientes.cozinha.layout"]).toMatch(/Opção inválida/);
    expect(errors["detalhesAmbientes.cozinha.eletros.geladeira"]).toMatch(/Opção inválida/);
    expect(errors["detalhesAmbientes.cozinha"]).toMatch(/Unrecognized key/);
  });

  it("descarta respostas de ambientes que foram desmarcados", () => {
    const parsed = briefingSchema.parse(
      minimalBriefing({
        ambientesSelecionados: ["quarto"],
        detalhesAmbientes: { cozinha: { layout: "Linear" }, quarto: { fechamento: "Portas de abrir" } },
      }),
    );
    expect(Object.keys(parsed.detalhesAmbientes)).toEqual(["quarto"]);
  });

  it("recusa links que não são http(s) (evita javascript: no painel)", () => {
    const errors = errorsOf(minimalBriefing({ referencias: ["javascript:alert(1)"] }));
    expect(errors["referencias.0"]).toBe("Cole um link completo (https://…)");
  });

  it("anexos: caminho precisa estar na pasta do envio, tipo e tamanho permitidos", () => {
    const base = { name: "a.pdf", size: 10, type: "application/pdf" };
    expect(errorsOf(minimalBriefing({ anexos: [{ ...base, path: `${SUBMISSION_ID}/abc-a.pdf` }] }))).toEqual({});
    expect(
      errorsOf(minimalBriefing({ anexos: [{ ...base, path: "0f8e7a6b-1c2d-4e3f-8a9b-000000000000/a.pdf" }] }))["anexos.0.path"],
    ).toBe("Anexo não pertence a este envio");
    expect(errorsOf(minimalBriefing({ anexos: [{ ...base, path: "../../etc/passwd" }] }))["anexos.0.path"]).toBe(
      "Caminho de anexo inválido",
    );
    expect(
      errorsOf(minimalBriefing({ anexos: [{ ...base, path: `${SUBMISSION_ID}/a.exe`, type: "application/x-msdownload" }] }))[
        "anexos.0.type"
      ],
    ).toBe("Formato de arquivo não aceito");
    expect(
      errorsOf(minimalBriefing({ anexos: [{ ...base, path: `${SUBMISSION_ID}/a.pdf`, size: 26 * 1024 * 1024 }] }))[
        "anexos.0.size"
      ],
    ).toMatch(/25 MB/);
  });

  it("descarta campos desconhecidos no nível raiz", () => {
    const parsed = briefingSchema.parse({ ...minimalBriefing(), isAdmin: true });
    expect(parsed).not.toHaveProperty("isAdmin");
  });
});

describe("validação por etapa", () => {
  it("etapa 1 lista os campos obrigatórios em branco", () => {
    const errors = validateStep(1, { nome: "", whatsapp: "", email: "", cidade: "" });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["nome", "whatsapp", "tipoImovel", "statusImovel", "previsaoInicio", "investimentoPrevisto"]),
    );
    expect(errors.email).toBeUndefined();
  });

  it("etapas 3 e 4 não têm campos obrigatórios", () => {
    expect(validateStep(3, { detalhesAmbientes: {} })).toEqual({});
    expect(validateStep(4, { estiloPrincipal: "", materiaisGostados: [], referencias: [] })).toEqual({});
  });

  it("stepForPath mapeia o campo de erro para a etapa certa", () => {
    expect(stepForPath("nome")).toBe(1);
    expect(stepForPath("ambientesSelecionados.0")).toBe(2);
    expect(stepForPath("detalhesAmbientes.cozinha.layout")).toBe(3);
    expect(stepForPath("anexos.0.path")).toBe(4);
    expect(stepForPath("consentimento")).toBe(5);
    expect(stepForPath("desconhecido")).toBe(5);
  });
});
