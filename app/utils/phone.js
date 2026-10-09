export { formatPhoneDisplay, normalizePhone } from "../features/leads/lead.mapper.js";

/**
 * Máscara progressiva para telefone brasileiro enquanto o usuário digita.
 *   "48999990000" → "(48) 99999-0000"
 *   "4833330000"  → "(48) 3333-0000"
 * Números começando com "+" (internacionais) ficam livres, só sem letras.
 */
export function maskPhoneInput(value) {
  const raw = String(value ?? "");
  if (raw.trim().startsWith("+")) return `+${raw.replace(/[^\d ]/g, "").replace(/^ +/, "")}`.slice(0, 20);

  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}
