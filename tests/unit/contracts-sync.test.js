// @vitest-environment node
/**
 * Garante que as Edge Functions usam exatamente as mesmas regras do site
 * e que o seed.sql reflete os dados de exemplo.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeedSql, SEED_PATH } from "../../scripts/generate-seed.mjs";
import { CONTRACT_FILES, expectedCopy, TARGET_DIR } from "../../scripts/sync-contracts.mjs";

describe("contratos compartilhados com as Edge Functions", () => {
  it.each(CONTRACT_FILES)("supabase/functions/_shared/%s está sincronizado (rode npm run sync:contracts)", (file) => {
    expect(readFileSync(join(TARGET_DIR, file), "utf8")).toBe(expectedCopy(file));
  });
});

describe("seed.sql", () => {
  it("está atualizado com app/lib/demo-data.js (rode npm run seed:generate)", () => {
    expect(readFileSync(SEED_PATH, "utf8")).toBe(buildSeedSql());
  });
});
