/**
 * Datas sempre no fuso de São Paulo, para que servidor (UTC) e navegador
 * produzam exatamente o mesmo texto na hidratação.
 */
const TIME_ZONE = "America/Sao_Paulo";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

function toDate(value) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "08 de out. de 2026" */
export function formatDate(value) {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "";
}

/** "08/10/2026, 20:30" */
export function formatDateTime(value) {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "";
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data. */
export function formatRelative(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return "";
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 0) return formatDate(date);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return formatDate(date);
}

/** Ano corrente no fuso do estúdio (rodapé). */
export function currentYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: TIME_ZONE }).format(now));
}
