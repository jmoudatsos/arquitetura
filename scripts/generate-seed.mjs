#!/usr/bin/env node
/**
 * Gera supabase/seed.sql a partir de app/lib/demo-data.js (mesmo conteúdo do
 * modo demonstração). Rode depois de editar os dados de exemplo:
 *
 *   npm run seed:generate
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_MEDIA, DEMO_PROJECTS, DEMO_SERVICES, DEMO_SITE_SETTINGS } from "../app/lib/demo-data.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SEED_PATH = join(root, "supabase/seed.sql");

function literal(value, cast) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value) && cast === "text[]") {
    if (value.length === 0) return "'{}'::text[]";
    return `array[${value.map((item) => literal(String(item))).join(", ")}]::text[]`;
  }
  if (cast === "jsonb") return `${literal(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'${cast ? `::${cast}` : ""}`;
}

function insert(table, rows, columns, conflict) {
  const header = `insert into public.${table} (${columns.map(([name]) => name).join(", ")})\nvalues\n`;
  const values = rows
    .map((row) => `  (${columns.map(([name, cast]) => literal(row[name], cast)).join(", ")})`)
    .join(",\n");
  return `${header}${values}\non conflict (${conflict}) do nothing;\n`;
}

export function buildSeedSql() {
  const settingsColumns = Object.keys(DEMO_SITE_SETTINGS).filter((key) => key !== "id");
  const settings = `update public.site_settings set\n${settingsColumns
    .map((key) => `  ${key} = ${literal(DEMO_SITE_SETTINGS[key] === "" ? null : DEMO_SITE_SETTINGS[key])}`)
    .join(",\n")}\nwhere id = 1;\n`;

  const services = insert(
    "services",
    DEMO_SERVICES,
    [
      ["id"], ["slug"], ["title"], ["summary"], ["description"], ["icon"],
      ["features", "text[]"], ["sort_order"], ["is_active"],
    ],
    "slug",
  );

  const projects = insert(
    "projects",
    DEMO_PROJECTS,
    [
      ["id"], ["slug"], ["title"], ["subtitle"], ["summary"], ["description"], ["category"], ["style"],
      ["location"], ["year"], ["area_m2"], ["materials", "text[]"], ["cover_image"], ["cover_alt"],
      ["gallery", "jsonb"], ["status"], ["featured"], ["sort_order"], ["published_at", "timestamptz"],
      ["seo_title"], ["seo_description"], ["is_sample"],
    ],
    "slug",
  );

  const media = insert(
    "media",
    DEMO_MEDIA,
    [["id"], ["bucket"], ["path"], ["url"], ["alt"], ["mime_type"], ["width"], ["height"], ["created_at", "timestamptz"]],
    "id",
  );

  return `-- ════════════════════════════════════════════════════════════════════════════
--  ARQUIVO GERADO por scripts/generate-seed.mjs a partir de app/lib/demo-data.js
--  Conteúdo de EXEMPLO (projetos com is_sample = true e fotos ilustrativas).
--  Sem Docker: cole este arquivo no SQL Editor do Supabase e execute.
-- ════════════════════════════════════════════════════════════════════════════

-- Configurações públicas (placeholders — edite em Admin › Configurações)
${settings}
-- Serviços
${services}
-- Projetos de exemplo
${projects}
-- Biblioteca de mídia (imagens locais em /public/images)
${media}
-- ────────────────────────────────────────────────────────────────────────────
--  PRIMEIRO ADMIN
--  1. Supabase → Authentication → Users → "Add user" (e-mail + senha, auto-confirmar)
--  2. Rode, trocando o e-mail:
--
--  insert into public.admin_users (user_id, role)
--  select id, 'owner' from auth.users where email = 'voce@seudominio.com.br'
--  on conflict (user_id) do nothing;
-- ────────────────────────────────────────────────────────────────────────────
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(SEED_PATH, buildSeedSql());
  console.log("✓ supabase/seed.sql gerado");
}
