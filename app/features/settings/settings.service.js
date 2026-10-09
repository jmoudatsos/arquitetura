import { DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_SITE_SETTINGS, SITE_SETTINGS_FIELDS } from "./settings.defaults.js";

function withDefaults(row, defaults) {
  const out = { ...defaults };
  for (const [key, value] of Object.entries(row ?? {})) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "" && key in defaults) continue;
    out[key] = value;
  }
  return out;
}

/** Configurações públicas do site (nunca falha: cai nos valores padrão). */
export async function getSiteSettings(db) {
  try {
    const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) console.error("[settings] erro ao ler site_settings:", error.message);
    return withDefaults(data, DEFAULT_SITE_SETTINGS);
  } catch (error) {
    console.error("[settings] falha inesperada ao ler site_settings:", error);
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

/** Valores crus (sem defaults) para preencher o formulário do admin. */
export async function getSiteSettingsForEdit(db) {
  const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar as configurações: ${error.message}`);
  const out = {};
  for (const field of SITE_SETTINGS_FIELDS) out[field] = data?.[field] ?? "";
  return out;
}

export async function updateSiteSettings(db, values) {
  const payload = {};
  for (const field of SITE_SETTINGS_FIELDS) {
    if (field in values) payload[field] = values[field] === "" ? null : values[field];
  }
  if (!payload.studio_name) payload.studio_name = DEFAULT_SITE_SETTINGS.studio_name;

  const { data, error } = await db.from("site_settings").update(payload).eq("id", 1).select("*");
  if (error) return { data: null, error };
  if (!data?.length) {
    return {
      data: null,
      error: { message: "Linha de configurações não encontrada. Rode a migração inicial do banco." },
    };
  }
  return { data: data[0], error: null };
}

export async function getNotificationSettings(db) {
  const { data, error } = await db.from("notification_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar as notificações: ${error.message}`);
  return withDefaults(data, DEFAULT_NOTIFICATION_SETTINGS);
}

export async function updateNotificationSettings(db, values) {
  const payload = {
    email_enabled: Boolean(values.email_enabled),
    email_recipients: values.email_recipients ?? [],
    whatsapp_enabled: Boolean(values.whatsapp_enabled),
    whatsapp_recipient: values.whatsapp_recipient || null,
  };
  const { data, error } = await db.from("notification_settings").update(payload).eq("id", 1).select("*");
  if (error) return { data: null, error };
  if (!data?.length) {
    return { data: null, error: { message: "Linha de notificações não encontrada. Rode a migração inicial." } };
  }
  return { data: data[0], error: null };
}
