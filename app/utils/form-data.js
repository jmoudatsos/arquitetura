/**
 * Helpers para ler FormData em actions.
 */

/** FormData → objeto simples (último valor vence; arquivos são ignorados). */
export function formToObject(formData) {
  const out = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Checkbox HTML: presente ("on"/"true") → true, ausente → false. */
export function checkbox(value) {
  return value === true || value === "on" || value === "true" || value === "1";
}

/** "" ou só espaços → null; senão o texto aparado. */
export function nullIfBlank(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/** Converte em lista: aceita array, JSON ("[...]") ou texto separado por vírgula/quebra de linha. */
export function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  const text = String(value ?? "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      /* cai para o split abaixo */
    }
  }
  return text
    .split(/[\n,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Remove caracteres que quebram filtros `or()` do PostgREST (vírgula, parênteses…). */
export function sanitizeSearch(value, maxLength = 60) {
  return String(value ?? "")
    .replace(/[,()*%\\:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
