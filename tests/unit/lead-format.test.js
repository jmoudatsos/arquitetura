import { describe, expect, it } from "vitest";
import { leadsToCsv } from "../../app/features/leads/lead.components.jsx";
import {
  buildWhatsAppUrl,
  describeLead,
  escapeHtml,
  formatLeadHtml,
  formatLeadSubject,
  formatLeadText,
} from "../../app/features/leads/lead.format.js";
import { briefingToLeadRow } from "../../app/features/leads/lead.mapper.js";
import { briefingSchema } from "../../app/features/leads/lead.schema.js";
import { maximalBriefing, minimalBriefing } from "../fixtures/briefing.js";

const lead = {
  id: "5e3d0000-0000-4000-8000-00000000aaaa",
  created_at: "2026-10-08T12:00:00Z",
  status: "novo",
  ...briefingToLeadRow(briefingSchema.parse(maximalBriefing()), { now: new Date("2026-10-08T12:00:00Z") }),
};

describe("briefingToLeadRow", () => {
  it("mapeia o formulário para as colunas do banco", () => {
    const row = briefingToLeadRow(briefingSchema.parse(minimalBriefing({ email: " A@B.COM " })));
    expect(row).toMatchObject({
      name: "Mariana Albuquerque",
      whatsapp: "5548999990000",
      email: "a@b.com",
      city: null,
      rooms: ["cozinha"],
      room_details: {},
      style: null,
      consent: true,
      source: "briefing",
    });
    expect(row.consent_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("remove respostas vazias e mantém as preenchidas", () => {
    const row = briefingToLeadRow(
      briefingSchema.parse(
        minimalBriefing({
          detalhesAmbientes: { cozinha: { layout: "Linear", necessidades: [], eletros: {}, observacoes: "  " } },
        }),
      ),
    );
    expect(row.room_details).toEqual({ cozinha: { layout: "Linear" } });
  });
});

describe("describeLead", () => {
  it("monta seções na ordem: cliente, ambientes, cada ambiente, estilo, referências", () => {
    const titles = describeLead(lead).map((section) => section.title);
    expect(titles.slice(0, 3)).toEqual(["Cliente & imóvel", "Ambientes", "Cozinha Planejada"]);
    expect(titles).toContain("Estilo & materiais");
    expect(titles).toContain("Referências & anexos");
    expect(titles.at(-1)).toBe("Observações");
  });

  it("formata a matriz de eletros e usa link assinado nos anexos", () => {
    const sections = describeLead(lead, { attachmentLinks: { [lead.attachments[0].path]: "https://signed/1" } });
    const kitchen = sections.find((section) => section.title === "Cozinha Planejada");
    const eletros = kitchen.rows.find(([label]) => label === "Eletrodomésticos & equipamentos");
    expect(eletros[1]).toContain("Geladeira / refrigerador: Já possuo");
    const attachments = sections.find((section) => section.title === "Referências & anexos").rows.filter(([l]) => l === "Anexo");
    expect(attachments[0]).toEqual(["Anexo", "Planta.pdf (1,9 MB)", "https://signed/1"]);
    expect(attachments[1][2]).toBeUndefined();
  });

  it("ambiente sem respostas aparece com aviso", () => {
    const sections = describeLead({ ...lead, rooms: ["office"], room_details: {} });
    expect(sections.find((s) => s.title === "Home Office / Ateliê").rows).toEqual([
      ["Detalhes", "Sem detalhes técnicos informados"],
    ]);
  });
});

describe("mensagens", () => {
  it("assunto do e-mail", () => {
    expect(formatLeadSubject({ name: "Ana", rooms: ["cozinha", "living"] })).toBe("Novo briefing: Ana — Cozinha, Living");
  });

  it("texto do WhatsApp com negrito, link do painel e corte respeitando o limite", () => {
    const text = formatLeadText(lead, { adminUrl: "https://site.test/admin/leads?lead=1" });
    expect(text.startsWith("*Novo briefing recebido*")).toBe(true);
    expect(text).toContain("*CLIENTE & IMÓVEL*");
    expect(text).toContain("• WhatsApp: +55 (48) 99999-0000");
    expect(text).toContain("Ver no painel: https://site.test/admin/leads?lead=1");

    const short = formatLeadText(lead, { adminUrl: "https://site.test/x", maxLength: 500 });
    expect(short.length).toBeLessThanOrEqual(500);
    expect(short).toContain("veja tudo em https://site.test/x");
  });

  it("HTML do e-mail escapa tudo que veio do cliente", () => {
    const html = formatLeadHtml({ ...lead, name: '<img src=x onerror="alert(1)">', notes: "<script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(escapeHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });

  it("HTML não cria links para URLs perigosas", () => {
    const html = formatLeadHtml({ ...lead, reference_links: ["javascript:alert(1)"] });
    expect(html).not.toContain('href="javascript:');
  });

  it("link click-to-chat", () => {
    expect(buildWhatsAppUrl("+55 (48) 99999-0000", "Olá & tchau")).toBe(
      "https://wa.me/5548999990000?text=Ol%C3%A1%20%26%20tchau",
    );
    expect(buildWhatsAppUrl("5548999990000")).toBe("https://wa.me/5548999990000");
  });
});

describe("CSV dos leads", () => {
  it("usa ; como separador, BOM para o Excel e neutraliza fórmulas", () => {
    const csv = leadsToCsv([{ ...lead, name: "=HYPERLINK(\"x\")", notes: "linha 1\nlinha 2; com ponto e vírgula" }]);
    expect(csv.startsWith("﻿Recebido em;Status;Nome")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"linha 1\nlinha 2; com ponto e vírgula"');
    expect(csv).toContain("55 (48) 99999-0000");
  });
});
