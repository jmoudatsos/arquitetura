import { afterEach, describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative } from "../../app/utils/format-date.js";
import { checkbox, nullIfBlank, sanitizeSearch, toList } from "../../app/utils/form-data.js";
import { imageUrl, mediaUrl } from "../../app/utils/image-url.js";
import { formatPhoneDisplay, maskPhoneInput, normalizePhone } from "../../app/utils/phone.js";
import { isValidSlug, slugify } from "../../app/utils/slugify.js";
import { isUuid, uuidv4 } from "../../app/utils/uuid.js";

describe("slugify", () => {
  it.each([
    ["Cozinha Nogueira & Pedra", "cozinha-nogueira-e-pedra"],
    ["  Suíte   com Marcenaria!! ", "suite-com-marcenaria"],
    ["Ação/Ênfase_Ç", "acao-enfase-c"],
    ["---", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("respeita o tamanho máximo sem deixar hífen no fim", () => {
    const slug = slugify("a".repeat(79) + " bcd", { maxLength: 80 });
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("valida o padrão aceito pelo banco", () => {
    expect(isValidSlug("cozinha-japandi")).toBe(true);
    expect(isValidSlug("Cozinha")).toBe(false);
    expect(isValidSlug("dupla--barra")).toBe(false);
  });
});

describe("telefone", () => {
  it.each([
    ["4", "(4"],
    ["48", "(48"],
    ["48999", "(48) 999"],
    ["4833330000", "(48) 3333-0000"],
    ["48999990000", "(48) 99999-0000"],
    ["4899999000099", "(48) 99999-0000"], // corta excesso
    ["+351 912", "+351 912"],
  ])("máscara %s → %s", (input, expected) => {
    expect(maskPhoneInput(input)).toBe(expected);
  });

  it("normaliza para DDI + DDD + número", () => {
    expect(normalizePhone("(48) 99999-0000")).toBe("5548999990000");
    expect(normalizePhone("048 3333-0000")).toBe("554833330000");
    expect(normalizePhone("+55 48 99999-0000")).toBe("5548999990000");
    expect(normalizePhone("+351 912 345 678")).toBe("351912345678");
  });

  it("formata para exibição", () => {
    expect(formatPhoneDisplay("5548999990000")).toBe("+55 (48) 99999-0000");
    expect(formatPhoneDisplay("554833330000")).toBe("+55 (48) 3333-0000");
    expect(formatPhoneDisplay("351912345678")).toBe("+351912345678");
    expect(formatPhoneDisplay("")).toBe("");
  });
});

describe("datas (fuso de São Paulo)", () => {
  it("formata data e hora", () => {
    // 02:30 UTC = 23:30 do dia anterior em São Paulo
    expect(formatDateTime("2026-10-09T02:30:00Z")).toBe("08/10/2026, 23:30");
    expect(formatDate("2026-10-09T02:30:00Z")).toMatch(/08 de out\.? de 2026/);
    expect(formatDate("data inválida")).toBe("");
  });

  it("tempo relativo", () => {
    const now = new Date("2026-10-08T12:00:00Z");
    expect(formatRelative("2026-10-08T11:59:30Z", now)).toBe("agora");
    expect(formatRelative("2026-10-08T11:55:00Z", now)).toBe("há 5 min");
    expect(formatRelative("2026-10-08T09:00:00Z", now)).toBe("há 3 h");
    expect(formatRelative("2026-10-07T11:00:00Z", now)).toBe("ontem");
    expect(formatRelative("2026-10-04T12:00:00Z", now)).toBe("há 4 dias");
  });
});

describe("imageUrl", () => {
  afterEach(() => {
    delete window.__ENV;
  });

  it("mantém URLs absolutas, data: e arquivos locais", () => {
    expect(imageUrl("https://cdn.site/x.jpg")).toBe("https://cdn.site/x.jpg");
    expect(imageUrl("/images/a.webp")).toBe("/images/a.webp");
    expect(imageUrl("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
    expect(imageUrl("")).toBeNull();
    expect(imageUrl(null)).toBeNull();
  });

  it("monta a URL pública do Storage com encoding", () => {
    window.__ENV = { SUPABASE_URL: "https://abc.supabase.co/" };
    expect(imageUrl("uploads/2026/10/foto cozinha.webp")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/site-media/uploads/2026/10/foto%20cozinha.webp",
    );
    expect(mediaUrl({ path: "x.webp", bucket: "outro" })).toBe("https://abc.supabase.co/storage/v1/object/public/outro/x.webp");
  });
});

describe("form-data helpers", () => {
  it("checkbox / nullIfBlank / toList", () => {
    expect(checkbox("on")).toBe(true);
    expect(checkbox(undefined)).toBe(false);
    expect(nullIfBlank("   ")).toBeNull();
    expect(nullIfBlank(" a ")).toBe("a");
    expect(toList("a, b\nc;;")).toEqual(["a", "b", "c"]);
    expect(toList('["x"," y "]')).toEqual(["x", "y"]);
  });

  it("sanitizeSearch remove caracteres que quebrariam o filtro or() do PostgREST", () => {
    expect(sanitizeSearch("maria,(silva)*%")).toBe("maria silva");
    expect(sanitizeSearch("a".repeat(100))).toHaveLength(60);
  });
});

describe("uuid", () => {
  it("gera UUID v4 válido", () => {
    const id = uuidv4();
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe("4");
    expect(isUuid("1; drop table")).toBe(false);
  });
});
