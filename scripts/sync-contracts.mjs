#!/usr/bin/env node
/**
 * Copia os "contratos" do briefing (opções, validação, formatação, mapeamento)
 * de app/features/leads/ para supabase/functions/_shared/, onde as Edge
 * Functions (Deno) os importam. Assim front, servidor e funções validam o
 * briefing com exatamente o mesmo código.
 *
 *   npm run sync:contracts
 *
 * O teste tests/unit/contracts-sync.test.js falha se as cópias estiverem velhas.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CONTRACT_FILES = ["briefing.options.js", "lead.schema.js", "lead.format.js", "lead.mapper.js"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE_DIR = join(root, "app/features/leads");
export const TARGET_DIR = join(root, "supabase/functions/_shared");

export function generatedHeader(file) {
  return `// ⚠️ ARQUIVO GERADO por scripts/sync-contracts.mjs — NÃO EDITE AQUI.\n// Fonte: app/features/leads/${file}  →  depois de editar a fonte, rode: npm run sync:contracts\n\n`;
}

export function expectedCopy(file) {
  return generatedHeader(file) + readFileSync(join(SOURCE_DIR, file), "utf8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const file of CONTRACT_FILES) {
    writeFileSync(join(TARGET_DIR, file), expectedCopy(file));
    console.log(`✓ ${file} → supabase/functions/_shared/${file}`);
  }
}
