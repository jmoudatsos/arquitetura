// ⚠️ ARQUIVO GERADO por scripts/sync-contracts.mjs — NÃO EDITE AQUI.
// Fonte: app/features/leads/lead.mapper.js  →  depois de editar a fonte, rode: npm run sync:contracts

/**
 * Conversão do briefing (formato do formulário, em português) para a linha da
 * tabela `public.leads`. Compartilhado com as Edge Functions — mantenha puro.
 * Depois de editar: `npm run sync:contracts`.
 */

/** Mantém só os dígitos e garante o código do país (Brasil por padrão). */
export function normalizePhone(value, defaultCountryCode = "55") {
  let digits = String(value ?? "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, ""); // "0 48 9…" → "48 9…"
  if (digits.length === 10 || digits.length === 11) return `${defaultCountryCode}${digits}`;
  return digits;
}

/** "5548999990000" → "+55 (48) 99999-0000" */
export function formatPhoneDisplay(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    const head = local.length === 9 ? local.slice(0, 5) : local.slice(0, 4);
    const tail = local.length === 9 ? local.slice(5) : local.slice(4);
    return `+55 (${ddd}) ${head}-${tail}`;
  }
  return digits ? `+${digits}` : "";
}

function compactAnswers(answers) {
  const out = {};
  for (const [key, value] of Object.entries(answers ?? {})) {
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = compactAnswers(value);
      if (Object.keys(nested).length === 0) continue;
      out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * @param {object} briefing  saída de `briefingSchema.parse(...)`
 * @param {{ now?: Date }} [options]
 */
export function briefingToLeadRow(briefing, { now = new Date() } = {}) {
  const roomDetails = {};
  for (const roomId of briefing.ambientesSelecionados ?? []) {
    const answers = compactAnswers(briefing.detalhesAmbientes?.[roomId]);
    if (Object.keys(answers).length) roomDetails[roomId] = answers;
  }

  const utm = Object.fromEntries(
    Object.entries(briefing.utm ?? {}).filter(([, value]) => typeof value === "string" && value),
  );

  return {
    source: briefing.origem || "briefing",
    name: briefing.nome.trim(),
    whatsapp: normalizePhone(briefing.whatsapp),
    email: briefing.email ? briefing.email.trim().toLowerCase() : null,
    city: briefing.cidade || null,
    property_type: briefing.tipoImovel,
    property_status: briefing.statusImovel,
    start_forecast: briefing.previsaoInicio,
    budget_range: briefing.investimentoPrevisto,
    rooms: [...(briefing.ambientesSelecionados ?? [])],
    room_details: roomDetails,
    style: briefing.estiloPrincipal || null,
    materials: [...(briefing.materiaisGostados ?? [])],
    reference_links: [...(briefing.referencias ?? [])],
    attachments: (briefing.anexos ?? []).map(({ path, name, size, type }) => ({ path, name, size, type })),
    notes: briefing.observacoesFinais || null,
    consent: briefing.consentimento === true,
    consent_at: briefing.consentimento === true ? now.toISOString() : null,
    utm,
  };
}
