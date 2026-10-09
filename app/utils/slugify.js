/**
 * "Cozinha Nogueira & Pedra!" → "cozinha-nogueira-pedra"
 * Remove acentos, caixa-alta e qualquer caractere fora de [a-z0-9].
 */
export function slugify(value, { maxLength = 80 } = {}) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value) {
  return SLUG_PATTERN.test(String(value ?? ""));
}
